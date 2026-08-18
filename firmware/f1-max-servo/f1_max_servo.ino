#include <EEPROM.h>
#include <SoftwareSerial.h>
#include <avr/pgmspace.h>
#include <avr/wdt.h>
#include <string.h>

/*
 * F1 MAX 完整固件（基于 F2 MAX servo + F1 折回 detour：180° 停留 1s 再收 item4）
 * Pro Mini 328P 程序区约 30720 字节；默认 F1_COMPACT_FLASH=1 关闭 USB 调试省 flash。
 * 维护：firmware/f1-max-servo/f1_max_servo.ino
 *
 * 功能分块（修改时尽量只动对应 BLOCK）：
 *   BLOCK: Status LED (Pin8)  — 翻开亮 / 折回灭
 *   BLOCK: Stealth mode         — 隐蔽模式进入/退出/计时
 *   BLOCK: Pin5 button          — 单击翻板 / 长按2s进 / 长按8s退
 *   BLOCK: Flap control         — requestFlapOpen / requestFlapClose / foldToRetract
 */

// 328P 用 VarSpeedServo；168 闪存不够，自动改用更小 Servo（功能相同）
#if defined(__AVR_ATmega328P__) || defined(__AVR_ATmega328__) || defined(__AVR_ATmega328PB__)
#include <VarSpeedServo.h>
#define F2_VARSERVO 1
#else
#include <Servo.h>
#define F2_VARSERVO 0
#endif

#define F1_COMPACT_FLASH 1

#if F1_COMPACT_FLASH
#define F2_SERIAL_DEBUG 0
#define F2_MOTION_A0_DEBUG 0
#define F2_KEY_SERIAL_DEBUG 0
#define F2_BLE_STATUS 1
#elif defined(__AVR_ATmega168__) || defined(__AVR_ATmega168P__) || defined(__AVR_ATmega168PA__)
#define F2_SERIAL_DEBUG 0
#define F2_MOTION_A0_DEBUG 0
#define F2_KEY_SERIAL_DEBUG 0
#define F2_BLE_STATUS 0
#else
#define F2_SERIAL_DEBUG 0
#define F2_MOTION_A0_DEBUG 1
#define F2_KEY_SERIAL_DEBUG 1
#define F2_BLE_STATUS 1
#endif

#define RX_BUF_SIZE 40

volatile int item;
volatile int judgeVal;
volatile int bianlaing;
volatile int fullOpenAngle;
volatile int customAngle;
volatile int item4;
volatile int accRetractOn;
volatile unsigned long lastReceiveTime;
volatile unsigned long timeout;
volatile int y;
volatile int selfCheckOn;
volatile int p;
volatile int powerOnFlip;
volatile int isRunning;
volatile int stuckCount;
volatile int singleExec;
volatile int pdSmooth;
volatile unsigned long openStartMs;
volatile unsigned long reboundWaitUntil;
volatile unsigned long lastStatusSend;
volatile unsigned long selfCheckStartMs;
volatile int reboundStuckCount;
volatile int reboundAttempt;
volatile uint8_t reboundFaultLatched;
volatile uint8_t faultMotorLatched;
volatile uint8_t pendingFaultReport;
volatile unsigned long lastStallSampleMs;
volatile unsigned long accReonStart;
volatile uint8_t stealthActive;
volatile int delayPowerOffMin;
volatile uint8_t userServoSpeed;
volatile unsigned long stealthWindowStart;
volatile unsigned long pin9HoldUntil;
volatile uint8_t pin9HoldExpired;
volatile uint8_t pendingKeyOffFold;
volatile uint8_t keyOffRetractBusy;
volatile uint8_t travelModeOn;
volatile uint8_t travelKeyOffRetractOn;
volatile int travelSavedDelayMin;
volatile uint16_t travelElapsedMin;
volatile unsigned long travelMinuteMark;
volatile uint8_t travelHoldMin;
volatile uint8_t travelAutoOffHours;
volatile uint16_t stealthElapsedMin;
volatile unsigned long stealthMinuteMark;
volatile uint8_t stealthBtnExitOn;
volatile uint8_t stallDetectOn;
volatile uint8_t motorWorkCheckOn;
/** 关钥匙前是否翻开：1=开 0=关，倒计时内再开钥匙时恢复（出行/普通收回均适用） */
static uint8_t travelKeyOnRestoreOpen = 0;
/** 本次上电后 2 号是否曾拉高；冷启动时钥匙一直关着不应触发「关钥匙收回」 */
static uint8_t pin2SeenHighSinceBoot = 0;
static unsigned long pin2LowSince = 0;
static unsigned long pin2HighSince = 0;
static uint8_t keyOffFoldHandled = 0;
static uint8_t lastPin2High = 1;
static uint8_t pin2EdgeInit = 0;
static uint8_t keyOffRetractIssued = 0;

const int MOTOR_IDLE_A0 = 1023;
const unsigned long STEALTH_ENTRY_WINDOW_MS = 10000UL;
const unsigned long KEY_ON_DEBOUNCE_MS = 250UL;
// 2 号关钥匙须持续低电平才认定（避免舵机大电流时 2 号抖动误触发收回）
const unsigned long KEY_OFF_DEBOUNCE_MS = 200UL;
const uint16_t STEALTH_AUTO_OFF_MIN = 180;
const int STEALTH_BLINK_ON_MS = 220;
const int STEALTH_BLINK_OFF_MS = 220;
const int STEALTH_ACK_ON_MS = 300;
const int STEALTH_ACK_OFF_MS = 300;
const unsigned long OPEN_GUARD_MS = 5000UL;
const unsigned long OPEN_GUARD_SMOOTH_MS = 8000UL;
// Pin5 按下后固定 10 秒检测窗（再次按 Pin5 打断并重开）
const unsigned long BTN_DETECT_WINDOW_MS = 10000UL;
const unsigned long BTN_DETECT_SAMPLE_MS = 5UL;
const int BTN_STALL_A0_THR = 820;
const int BTN_STALL_RELEASE_A0_THR = 840;
const int BTN_MOTOR_RUN_DROP = 5;
const int BTN_MOTOR_RUN_HITS_NEED = 4;
const int BTN_STALL_HITS_NEED = 10;
// 每次翻板动作开始后屏蔽堵转判定的时长（A0 启动浪涌易误触发）
const unsigned long STALL_STARTUP_SHIELD_MS = 500UL;
const unsigned long REBOUND_RETRY_WAIT_MS = 800UL;
const int STALL_CURRENT_DEFAULT = 860;
const int MOTOR_RUN_THRESHOLD = 1000;
const unsigned long MOTOR_RUN_SAMPLE_GAP_MS = 8UL;
const uint8_t MOTOR_RUN_BURST_SAMPLES = 8;
const int MOTOR_RUN_MIN_SAMPLES = 24;
const unsigned long MOTOR_RUN_ALARM_MS = 2800UL;
const unsigned long MOTOR_RUN_ALARM_SMOOTH_MS = 4200UL;
const unsigned long STALL_SAMPLE_GAP_MS = 12UL;
const unsigned long STALL_REBOUND_SAMPLE_GAP_MS = 10UL;
const unsigned long STALL_ARM_MS = 200UL;
const unsigned long STALL_ANGLE_STILL_MS = 0UL;
const int STALL_DETECT_A0 = 680;
const int STALL_DETECT_RELEASE = 820;
const int STALL_STUCK_NEED = 18;
const unsigned long JUDGE_WINDOW_MS = 1000UL;
const int STALL_HIT_NEED = 4;
const int STALL_REBOUND_HIT_NEED = 3;
const int STALL_REBOUND_SENS_MARGIN = 60;
const int STALL_REBOUND_HYST = 25;
const uint8_t MOTOR_A0_BURST_SAMPLES = 12;
const unsigned int MOTOR_A0_SAMPLE_DELAY_MS = 1;
const unsigned long OPEN_GUARD_REBOUND_MS = 12000UL;
const int STALL_JUDGE_MIN = 300;
const int STALL_JUDGE_MAX = 1023;
const int AUTO_LEVEL_FOLD_THR = 950;
const int AUTO_LEVEL_OPEN_THR = 950;
const uint8_t SMOOTH_TAIL_PCT = 28;
const int SMOOTH_TAIL_MIN_DEG = 3;
const int SMOOTH_LIVE_JUMP_MAX_DEG = 10;
const unsigned int SMOOTH_TAIL_STEP_MS = 56;
const unsigned int SMOOTH_CRUISE_MS_PER_DEG = 24;
const int REBOUND_EASE_TAIL_DEG = 14;
const unsigned int REBOUND_EASE_STEP_MS = 11;
const unsigned int REBOUND_EASE_POLL_MS = 20;
const unsigned int REBOUND_EASE_MS_PER_DEG = 18;
const uint8_t REBOUND_EASE_SPEED_CRUISE = 48;
const uint8_t REBOUND_EASE_SPEED_TAIL = 24;
const unsigned long OPEN_REBOUND_GRACE_MS = 500UL;
// 主动堵转检测：最多 2 次「堵转→自动收回」；第 2 次收回后报警，不再重试打开
const uint8_t STALL_REBOUND_MAX = 2;
// 开机后数秒内禁止堵转反弹/自检故障，避免误触发来回抖
const unsigned long BOOT_SETTLE_MS = 6000UL;
// 上电后先等电源/驱动稳定，指示灯开始闪后再发开机 PWM 目标角
const unsigned long BOOT_PWR_SETTLE_MS = 800UL;
const unsigned long BOOT_LED_LEAD_ON_MS = 400UL;
const unsigned int BOOT_FOLD_SLOW_HALF_MS = 500;
const unsigned long MOTION_DETECT_LED_HALF_MS = 300UL;
const uint8_t FAULT_ACK_BLINK_TIMES = 6;
/** 故障报警 Pin8：半周期 75ms → 约 6.7Hz 快速闪烁 */
const unsigned long FAULT_LED_BLINK_HALF_MS = 75UL;
// 到位后立即 detach，持续 PWM 会导致数字舵机微抖
const unsigned long SERVO_PWM_HOLD_MS = 0UL;

const char CMD_OPEN[] PROGMEM = "\xE6\x89\x93\xE5\xBC\x80";
const char CMD_CLOSE[] PROGMEM = "\xE5\x85\xB3\xE9\x97\xAD";
const char CMD_SMOOTH_ON[] PROGMEM = "\xE5\xBC\x80\xE5\x90\xAF\xE5\xB9\xB3\xE6\xBB\x91";
const char CMD_SMOOTH_OFF[] PROGMEM = "\xE5\x85\xB3\xE9\x97\xAD\xE5\xB9\xB3\xE6\xBB\x91";
const char CMD_AUTO_LEVEL[] PROGMEM = "\xE8\x87\xAA\xE5\x8A\xA8\xE8\xB0\x83\xE5\xB9\xB3";
const char CMD_ACC_ON[] PROGMEM = "\xE6\x89\x93\xE5\xBC\x80\xE6\x94\xB6\xE5\x9B\x9E";
const char CMD_ACC_OFF[] PROGMEM = "\xE5\x85\xB3\xE9\x97\xAD\xE6\x94\xB6\xE5\x9B\x9E";
const char CMD_CHECK_ON[] PROGMEM = "\xE5\xBC\x80\xE5\x90\xAF\xE8\x87\xAA\xE6\xA3\x80";
const char CMD_CHECK_OFF[] PROGMEM = "\xE5\x85\xB3\xE9\x97\xAD\xE8\x87\xAA\xE6\xA3\x80";
const char CMD_STALL_CHK_ON[] PROGMEM = "\xE5\xBC\x80\xE5\x90\xAF\xE5\xA0\xB5\xE8\xBD\xAC\xE6\xA3\x80\xE6\xB5\x8B";
const char CMD_STALL_CHK_OFF[] PROGMEM = "\xE5\x85\xB3\xE9\x97\xAD\xE5\xA0\xB5\xE8\xBD\xAC\xE6\xA3\x80\xE6\xB5\x8B";
const char CMD_MOTOR_CHK_ON[] PROGMEM = "\xE5\xBC\x80\xE5\x90\xAF\xE7\x94\xB5\xE6\x9C\xBA\xE6\xA3\x80\xE6\xB5\x8B";
const char CMD_MOTOR_CHK_OFF[] PROGMEM = "\xE5\x85\xB3\xE9\x97\xAD\xE7\x94\xB5\xE6\x9C\xBA\xE6\xA3\x80\xE6\xB5\x8B";
const char CMD_FAULT_ACK[] PROGMEM = "\xE6\x95\x85\xE9\x9A\x9C\xE5\xB7\xB2\xE8\xAF\xBB";
const char CMD_PWR_UP[] PROGMEM = "\xE5\xBC\x80\xE6\x9C\xBA\xE4\xB8\x8A\xE7\xBF\xBB";
const char CMD_PWR_DN[] PROGMEM = "\xE5\xBC\x80\xE6\x9C\xBA\xE4\xB8\x8B\xE7\xBF\xBB";
const char CMD_UP[] PROGMEM = "\xE5\xBE\x80\xE4\xB8\x8A\xE6\x94\xB6";
const char CMD_DOWN[] PROGMEM = "\xE5\xBE\x80\xE4\xB8\x8B";
const char CMD_FULL_OPEN[] PROGMEM = "\xE5\xAE\x8C\xE5\x85\xA8\xE6\x89\x93\xE5\xBC\x80";
const char CMD_CUSTOM[] PROGMEM = "\xE8\x87\xAA\xE5\xAE\x9A\xE4\xB9\x89\xE5\x8A\x9F\xE8\x83\xBD";
const char CMD_INIT_ANGLE[] PROGMEM = "\xE5\x88\x9D\xE5\xA7\x8B\xE5\x8C\x96\xE8\xA7\x92\xE5\xBA\xA6";
const char CMD_ADJ_FOLD[] PROGMEM = "\xE8\xB0\x83\xE6\x95\xB4\xE6\x8A\x98\xE5\x8F\xA0\xE8\xA7\x92\xE5\xBA\xA6";
const char CMD_ADJ_BIG[] PROGMEM = "\xE8\xB0\x83\xE5\xA4\xA7";
const char CMD_ADJ_SMALL[] PROGMEM = "\xE8\xB0\x83\xE5\xB0\x8F";
const char CMD_STEALTH_ON[] PROGMEM = "\xE5\xBC\x80\xE5\x90\xAF\xE9\x9A\x90\xE8\x94\xBD";
const char CMD_STEALTH_OFF[] PROGMEM = "\xE9\x80\x80\xE5\x87\xBA\xE9\x9A\x90\xE8\x94\xBD";
const char CMD_STEALTH_BTN_ON[] PROGMEM = "\xE5\x85\x81\xE8\xAE\xB8\xE6\x8C\x89\xE9\x92\xAE\xE9\x80\x80\xE5\x87\xBA";
const char CMD_STEALTH_BTN_OFF[] PROGMEM = "\xE7\xA6\x81\xE6\xAD\xA2\xE6\x8C\x89\xE9\x92\xAE\xE9\x80\x80\xE5\x87\xBA";
const char CMD_DELAY_PWR[] PROGMEM = "\xE5\xBB\xB6\xE6\x97\xB6\xE6\x96\xAD\xE7\x94\xB5";
const char CMD_TRAVEL_ON[] PROGMEM = "\xE5\xBC\x80\xE5\x90\xAF\xE5\x87\xBA\xE8\xA1\x8C";
const char CMD_TRAVEL_OFF[] PROGMEM = "\xE5\x85\xB3\xE9\x97\xAD\xE5\x87\xBA\xE8\xA1\x8C";
const char CMD_TRAVEL_HOLD[] PROGMEM = "\xE5\x87\xBA\xE8\xA1\x8C\xE4\xBF\x9D\xE6\x8C\x81";
const char CMD_TRAVEL_TIME[] PROGMEM = "\xE5\x87\xBA\xE8\xA1\x8C\xE6\x97\xB6\xE9\x95\xBF";
const char CMD_TRAVEL_KEY_HOLD[] PROGMEM = "\xE5\x87\xBA\xE8\xA1\x8C\xE9\x92\xA5\xE5\x8C\x99\xE4\xBF\x9D\xE6\x8C\x81";
const char CMD_TRAVEL_KEY_FOLD[] PROGMEM = "\xE5\x87\xBA\xE8\xA1\x8C\xE9\x92\xA5\xE5\x8C\x99\xE6\x94\xB6\xE5\x9B\x9E";
const char CMD_SPEED[] PROGMEM = "\xE8\xB0\x83\xE9\x80\x9F";
const uint8_t SERVO_SPEED_MIN_PCT = 10;
const uint8_t SERVO_SPEED_MAX_PCT = 100;
const uint8_t SERVO_SPEED_DEFAULT_PCT = 100;
const int DELAY_PWR_MIN_MAX = 10080;
const uint8_t TRAVEL_HOLD_MIN_DEFAULT = 3;
const uint8_t TRAVEL_HOLD_MIN_MIN = 1;
const uint8_t TRAVEL_HOLD_MIN_MAX = 30;
const uint8_t TRAVEL_AUTO_OFF_H_DEFAULT = 12;
const uint8_t TRAVEL_AUTO_OFF_H_MIN = 1;
const uint8_t TRAVEL_AUTO_OFF_H_MAX = 48;
const int TRAVEL_DEFAULT_DELAY_MIN = 5;

void handleBleCommand(char *cmd);

void foldToRetract();
static void f1FoldDetourAbort();
static void f1FoldDetourArmOnOpen();
static bool f1FoldShouldDetour();
static void f1BeginFoldDetourMotion();
static bool f1UpdateFoldDetour();
void retractForStall();
void writeServoFaultFastFold();
void triggerStallRebound();
void triggerStallDuringClose();
void requestFlapOpen(bool stallRetry = false);
void requestFlapClose(bool userRequest = true);
bool canUserFlapControl();
void updatePin9Power();
void armPin9KeyOffHold();
void tickStealthKeyWindow();
void watchdogFeed();
void watchdogBegin();
void requestSoftwareReset();
bool isKeyOffCountdownActive();
void serviceInputsPoll();
void btn5ServiceTick();
void btn5Init();
void btn5NoteStealthExited();
void statusLedUpdate();
void blinkPin8(uint8_t times, int onMs, int offMs);
void enterStealthMode();
void exitStealthMode();
void clearOpenMonitor();
void tickFaultAlarm();
bool faultIndicatorActive();
void enterFaultLockState(bool holdCurrentAngle = false);
bool isSelfCheckFaultLatched();
bool btnDetectWindowActive();
void restartBtnDetectWindow();
void finishBtnDetectWindow();
void savePendingFaultReport(uint8_t errType);
void clearBtnDetectSamples();
void sendStatusPacket();

#if F2_KEY_SERIAL_DEBUG
static void keyDbgLine(const __FlashStringHelper *tag);
static void keyDbgKv(const __FlashStringHelper *tag, int a, int b = -9999);
#else
#define keyDbgLine(tag) ((void)0)
#define keyDbgKv(tag, a, b) ((void)0)
#endif

#if F1_COMPACT_FLASH
#define AUTO_LEVEL_LOG_LINE(tag) ((void)0)
#define AUTO_LEVEL_LOG_KV(k, v) ((void)0)
#define AUTO_LEVEL_LOG_SCAN(a, b, c) ((void)0)
#define AUTO_LEVEL_LOG_HIT(a, b) ((void)0)
#else
#define AUTO_LEVEL_LOG_LINE(tag) autoLevelLogLine(tag)
#define AUTO_LEVEL_LOG_KV(k, v) autoLevelLogKV(k, v)
#define AUTO_LEVEL_LOG_SCAN(a, b, c) autoLevelLogScan(a, b, c)
#define AUTO_LEVEL_LOG_HIT(a, b) autoLevelLogHit(a, b)
#endif

SoftwareSerial mySerial(6, 7);

char rxBuf[RX_BUF_SIZE];
uint8_t rxLen = 0;
int lastWrittenAngle = -1;
int servoTrackItem = -1;
int servoTrackAngle = -1;
uint8_t foldHoldActive = 0;
uint8_t openEaseActive = 0;
uint8_t foldAdjustActive = 0;
uint8_t servoPwmOff = 1;
static uint8_t smoothPhase = 0;
static int smoothTarget = 0;
static int smoothMotionItem = -1;
static int smoothCurrent = -1;
static int smoothCruiseEnd = 0;
static int smoothMoveStart = 0;
static int smoothTailSpanStored = 0;
static unsigned long smoothPhaseUntil = 0;
static unsigned long smoothLastTick = 0;
uint8_t forceServoMove = 0;
unsigned long servoPwmHoldUntil = 0;
uint8_t autoLevelBusy = 0;
uint8_t autoLevelDone = 0;
static uint8_t reboundRetryClose = 0;

const int F1_FOLD_DETOUR_ANGLE = 180;
const unsigned long F1_FOLD_DETOUR_HOLD_MS = 1000UL;
uint8_t foldDetourArmed = 0;
// foldDetourPhase: 0=无 1=去180 2=180停留 3=去item4
static uint8_t foldDetourPhase = 0;
static unsigned long foldDetourHoldUntil = 0;

int lastMotorA0 = -1;
unsigned long lastMotorSampleMs = 0;
unsigned long lastMotorRunSampleMs = 0;
int motorRunSamples = 0;
int motorRunHits = 0;
unsigned long bootSettleUntil = 0;
unsigned long btnDetectStartMs = 0;
unsigned long flapSettleUntil = 0;
uint8_t motorEverRan = 0;
int btnDetectA0Baseline = 1023;
int btnDetectA0Min = 1023;

bool tickMotionA0Realtime(bool forceSample);
void debugPrintMotionA0(int a0);

#define SERVO_MOTION_PIN 11

#if F2_VARSERVO
VarSpeedServo servo;
#else
Servo servo;
#endif

void servoMotionOn() {
  digitalWrite(SERVO_MOTION_PIN, HIGH);
}

void servoMotionOff() {
  digitalWrite(SERVO_MOTION_PIN, LOW);
}

void servoStopHold() {
#if F2_VARSERVO
  servo.stop();
#endif
  servo.detach();
  servoPwmOff = 1;
  servoPwmHoldUntil = 0;
  servoMotionOff();
}

void servoCancelPwmHold() {
  servoPwmHoldUntil = 0;
}

void servoSchedulePwmRelease() {
  if (servoPwmOff || item == 3) return;
  servoStopHold();
}

// 运动结束：写最终角并立刻断开 PWM
void servoFinalizePosition(int angle) {
  if (angle < 0) angle = 0;
  if (angle > 180) angle = 180;
  if (!servoPwmOff) {
#if F2_VARSERVO
    servo.write(angle);
    servo.stop();
#else
    servo.write(angle);
#endif
  }
  lastWrittenAngle = angle;
  servoStopHold();
}

static int servoAttachSeedAngle() {
  if (lastWrittenAngle >= 0 && lastWrittenAngle <= 180) return lastWrittenAngle;
  if (item4 >= 0 && item4 <= 180) return item4;
  return 90;
}

void servoPrepareMove() {
  if (item == 3) return;
  servoCancelPwmHold();
  if (servoPwmOff) {
    int seed = servoAttachSeedAngle();
    // attach 前先写入指令角，避免第一帧 PWM 落在库默认 90°
    servo.write(seed);
    servo.attach(4);
    servo.write(seed);
    servoPwmOff = 0;
    lastWrittenAngle = seed;
  }
  servoMotionOn();
}

void servoAttachForMove() {
  servoPrepareMove();
}

void tickServoPwmHold() {
  if (item == 3) {
    if (!servoPwmOff) servoStopHold();
    return;
  }
  if (servoPwmOff || openEaseActive || autoLevelBusy) return;
  if (flapSettleUntil != 0 && (long)(millis() - flapSettleUntil) < 0) return;
  if (servoPwmHoldUntil == 0) return;
  if (reboundWaitUntil > 0) return;
  if (millis() < servoPwmHoldUntil) return;
  servoStopHold();
}

void servoWriteEaseStep(int angle, uint8_t speed) {
#if F2_VARSERVO
  if (speed > 0) servo.write(angle, speed);
  else servo.write(angle);
#else
  (void)speed;
  servo.write(angle);
#endif
}

uint8_t getUserServoSpeedByte() {
  uint8_t p = userServoSpeed;
  if (p < SERVO_SPEED_MIN_PCT) p = SERVO_SPEED_MIN_PCT;
  if (p > SERVO_SPEED_MAX_PCT) p = SERVO_SPEED_MAX_PCT;
#if F2_VARSERVO
  return (uint8_t)map(p, SERVO_SPEED_MIN_PCT, SERVO_SPEED_MAX_PCT, 35, 255);
#else
  return 255;
#endif
}

uint8_t scaleServoSpeed(uint8_t base) {
  if (base == 0) return 0;
  uint16_t scaled = (uint16_t)base * userServoSpeed / 100;
  if (scaled < 20) scaled = 20;
  if (scaled > 255) scaled = 255;
  return (uint8_t)scaled;
}

unsigned int scaleMoveDelayMs(unsigned int ms) {
  if (userServoSpeed >= 100) return ms;
  unsigned long scaled = (unsigned long)ms * 100UL / userServoSpeed;
  if (scaled > 60000UL) scaled = 60000UL;
  return (unsigned int)scaled;
}

void updateServoOutput();
int readServoAngle();
void selfCheckTick();
bool smoothMotionRunning();

static unsigned long flapMoveSettleMs(int fromAngle, int toAngle) {
  unsigned long ms = (unsigned long)abs(toAngle - fromAngle) * 28UL + 400UL;
  if (ms < 400UL) ms = 400UL;
  if (ms > 2500UL) ms = 2500UL;
  return scaleMoveDelayMs((unsigned int)ms);
}

void tickFlapServoHold(int target) {
  if (item != 0 && item != 1) return;
  // 已武装 F1 绕路时勿走慢速 hold（尤其开机下翻后第一次折回）
  if (item == 0 && foldDetourArmed && !foldAdjustActive) return;

  if (!forceServoMove && servoMoveCommitted(target) && servoPwmOff && flapSettleUntil == 0) {
    if (item == 0) foldHoldActive = 1;
    return;
  }

  if (forceServoMove || servoTrackItem != item || servoTrackAngle != target) {
    forceServoMove = 0;
    servoPrepareMove();
    int start = readServoAngle();
    if (start < 0 || start > 180) {
      start = (target == bianlaing) ? item4 : bianlaing;
      if (start < 0 || start > 180) start = target;
    }
#if F2_VARSERVO
    {
      uint8_t moveSpd = (foldDetourPhase != 0) ? (uint8_t)255 : getUserServoSpeedByte();
      servoWriteEaseStep(target, moveSpd);
    }
#else
    servoWriteEaseStep(target, getUserServoSpeedByte());
#endif
    if (start >= 0 && start <= 180) lastWrittenAngle = start;
    servoTrackItem = item;
    servoTrackAngle = target;
    if (foldDetourPhase == 0) {
      flapSettleUntil = millis() + flapMoveSettleMs(start, target);
    } else {
      flapSettleUntil = 0;
    }
    foldHoldActive = 0;
    return;
  }

  if (flapSettleUntil != 0 && foldDetourPhase == 0 &&
      (long)(millis() - flapSettleUntil) < 0) {
    if (selfCheckOn == 1 && btnDetectWindowActive()) {
      tickMotionA0Realtime(true);
    }
    return;
  }

  flapSettleUntil = 0;
  if (smoothMotionRunning() || openEaseActive) return;
  if (servoPwmOff) {
    if (item == 0) foldHoldActive = 1;
    return;
  }
  if (servoPwmHoldUntil != 0) {
    if (item == 0) foldHoldActive = 1;
    return;
  }

  lastWrittenAngle = target;
  servoFinalizePosition(target);
  if (item == 0) foldHoldActive = 1;
  if (selfCheckOn == 1 && !reboundFaultLatched && !faultMotorLatched) {
    reboundAttempt = 0;
    reboundWaitUntil = 0;
    reboundRetryClose = 0;
    lastStatusSend = 0;
  }
}

// 数字舵机到位后需停 PWM，否则会持续保持信号导致抖动
void waitServoSettle(int target) {
  int start = lastWrittenAngle;
  if (start < 0 || start > 180) start = readServoAngle();
  unsigned long moveMs = (unsigned long)abs(target - start) * 28UL + 250UL;
  if (moveMs < 250UL) moveMs = 250UL;
  if (moveMs > 2500UL) moveMs = 2500UL;
  unsigned long deadline = millis() + moveMs;
  while (millis() < deadline) {
    if (btnDetectWindowActive()) {
      tickMotionA0Realtime(true);
      if (isSelfCheckFaultLatched()) return;
    }
    delayWithBlePoll(16);
    if (selfCheckOn == 1 && (item == 0 || item == 1)) {
      int live = readServoAngle();
      if (live >= 0 && live <= 180) lastWrittenAngle = live;
    }
#if F2_VARSERVO
    int pos = servo.read();
    if (pos >= 0) {
      lastWrittenAngle = pos;
      if (abs(pos - target) <= 2) break;
    }
#endif
  }
}

void servoReleaseAtTarget(int angle) {
  servoFinalizePosition(angle);
}

void invalidateServoHold();
void writeServo(int angle);
void writeServoDirect(int angle);
void smoothMotionAbort();
void smoothMotionBegin(int target);
void tickSmoothServoMotion(int target);
bool smoothMotionRunning();
bool servoAtAngle(int angle);
void abortOpenMotion();

bool cmdIsP(const char *cmd, const char *refProgmem) {
  return strcmp_P(cmd, refProgmem) == 0;
}

int parseCmdSuffixInt(const char *cmd, const char *refProgmem) {
  char pfx[24];
  strncpy_P(pfx, refProgmem, sizeof(pfx) - 1);
  pfx[sizeof(pfx) - 1] = 0;
  size_t n = strlen(pfx);
  if (strncmp(cmd, pfx, n) != 0) return -1;
  return atoi(cmd + n);
}

void trimBuf(char *s) {
  uint8_t len = strlen(s);
  while (len > 0 && (s[len - 1] == '\r' || s[len - 1] == '\n' || s[len - 1] == ' ')) {
    s[--len] = 0;
  }
  uint8_t start = 0;
  while (s[start] == ' ' || s[start] == '\r' || s[start] == '\n') start++;
  if (start > 0) memmove(s, s + start, strlen(s + start) + 1);
}

void drainBleRx() {
  while (mySerial.available()) mySerial.read();
  rxLen = 0;
  rxBuf[0] = 0;
  lastReceiveTime = 0;
}

void pollBleSerial() {
  while (mySerial.available()) {
    int b = mySerial.read();
    if (b < 0) break;
    char c = (char)(b & 0xFF);
    if (c == '\r' || c == '\n') {
      if (rxLen > 0) lastReceiveTime = 0;
      continue;
    }
    if (rxLen < RX_BUF_SIZE - 1) rxBuf[rxLen++] = c;
    lastReceiveTime = millis();
  }
  if (rxLen > 0 && millis() - lastReceiveTime > timeout) {
    rxBuf[rxLen] = 0;
    rxLen = 0;
    trimBuf(rxBuf);
    if (rxBuf[0] == 0) return;
    handleBleCommand(rxBuf);
  }
}

bool sampleStallDuringOpen();
bool tickMotionA0Realtime(bool forceSample);

bool flapOpenMoving() {
  if (item != 1) return false;
  return openEaseActive || smoothMotionRunning() || flapSettleUntil != 0 || !servoAtAngle(bianlaing);
}

bool flapCloseMoving() {
  if (item != 0) return false;
  if (foldDetourPhase != 0) return true;
  return openEaseActive || smoothMotionRunning() || flapSettleUntil != 0 || !servoAtAngle(item4);
}

bool flapMotionMoving() {
  if (item == 1) return flapOpenMoving();
  if (item == 0) return flapCloseMoving();
  return false;
}

// BLE 状态包 ITM：运动中上报 2，避免收回瞬间显示「已关闭」
int statusItemForBle() {
  if (item == 3) return 3;
  if ((item == 0 || item == 1) && flapMotionMoving()) return 2;
  return item;
}

bool openMotionActive() {
  return flapMotionMoving();
}

// F2 Ultra：堵转检测 / 电机工作检测 可独立开关；未写入 EEPROM 时回退 selfCheckOn（F2 Max 兼容）
bool stallCheckActive() {
  if (stallDetectOn == 0 || stallDetectOn == 1) return stallDetectOn == 1;
  return selfCheckOn == 1;
}

bool motorWorkCheckActive() {
  if (motorWorkCheckOn == 0 || motorWorkCheckOn == 1) return motorWorkCheckOn == 1;
  return selfCheckOn == 1;
}

bool motionCheckActive() {
  if (keyOffRetractBusy) return false;
  return stallCheckActive() || motorWorkCheckActive();
}

// 出行模式：不走 accRetractOn / 开机上翻下翻 / 软复位
// travelKeyOffRetractOn=0 保持：关钥匙不控制翻板；再开钥匙下翻（展开）
// travelKeyOffRetractOn=1 收回：关钥匙收起，再开钥匙下翻（展开）
static bool keyOffRetractEnabled() {
  if (travelModeOn && item != 3) {
    return travelKeyOffRetractOn == 1;
  }
  return accRetractOn == 1;
}

// 是否允许本次「关钥匙收回」：冷启动钥匙一直关且从未翻开 → 不触发
static bool keyOffRetractEligible() {
  if (pin2SeenHighSinceBoot) return true;
  if (item == 1) return true;
  return false;
}

static int readServoAngleLive();

static bool flapPhysicallyAtFold() {
  int live = readServoAngleLive();
  if (live < 0 || live > 180) return false;
  return abs(live - item4) <= 2;
}

// 关机位置=收回且 2 号已关：收牌全程不做堵转/电机检测
static void armKeyOffRetractSuppress() {
  if (!keyOffRetractEnabled()) return;
  if (digitalRead(2) != LOW) return;
  keyOffRetractBusy = 1;
  clearOpenMonitor();
  reboundWaitUntil = 0;
  reboundAttempt = 0;
  reboundRetryClose = 0;
  reboundStuckCount = 0;
  stuckCount = 0;
}

static void tickKeyOffRetractDone() {
  if (!keyOffRetractBusy) return;
  if (digitalRead(2) == HIGH || !keyOffRetractEnabled()) {
    keyOffRetractBusy = 0;
    return;
  }
  if (item == 0 && !openEaseActive && flapPhysicallyAtFold()) {
    keyOffRetractBusy = 0;
  }
}

// Pin5 检测窗：按下起 10 秒内持续采样；再次按 Pin5 由 restartBtnDetectWindow 打断重开
bool btnDetectWindowActive() {
  if (!motionCheckActive()) return false;
  if (btnDetectStartMs == 0) return false;
  return (millis() - btnDetectStartMs) <= BTN_DETECT_WINDOW_MS;
}

bool selfCheckMotionActive() {
  return btnDetectWindowActive();
}

bool selfCheckOpenActive() {
  return selfCheckMotionActive();
}

// 与旧版一致：单次 analogRead（burst+delay 会卡住舵机 PWM，读到的全是 1023）
int readMotorA0() {
  (void)analogRead(A0);
  return analogRead(A0);
}

int readMotorA0BurstCount(uint8_t sampleCount) {
  (void)sampleCount;
  return readMotorA0();
}

int readMotorA0Burst() {
  return readMotorA0();
}

void clearBtnDetectSamples() {
  stuckCount = 0;
  isRunning = 0;
  motorEverRan = 0;
  singleExec = 0;
  motorRunSamples = 0;
  motorRunHits = 0;
  lastMotorSampleMs = 0;
  lastMotorRunSampleMs = 0;
  lastMotorA0 = -1;
  btnDetectA0Baseline = 1023;
  btnDetectA0Min = 1023;
}

// 翻开已到位：检测窗结束仍未见电机信号 → 只报警，不驱动收回
static bool flapHoldingOpenPosition() {
  if (item != 1 || openEaseActive) return false;
  if (servoMoveCommitted(bianlaing)) return true;
  int ang = readServoAngle();
  return ang >= 0 && abs(ang - bianlaing) <= 3;
}

static int motorWorkA0Threshold() {
  int thr = btnDetectA0Baseline - BTN_MOTOR_RUN_DROP;
  if (thr > MOTOR_RUN_THRESHOLD) thr = MOTOR_RUN_THRESHOLD;
  return thr;
}

static bool motorA0IndicatesRun(int a0) {
  return a0 <= motorWorkA0Threshold();
}

void restartBtnDetectWindow() {
  btnDetectStartMs = millis();
  openStartMs = btnDetectStartMs;
  selfCheckStartMs = btnDetectStartMs;
  clearBtnDetectSamples();
  int sum = 0;
  for (uint8_t i = 0; i < 6; i++) {
    sum += readMotorA0();
    delay(3);
  }
  btnDetectA0Baseline = sum / 6;
  btnDetectA0Min = btnDetectA0Baseline;
}

void finishBtnDetectWindow() {
  if (btnDetectStartMs == 0) return;
  btnDetectStartMs = 0;
  openStartMs = 0;
  if (motorWorkCheckActive() && !motorEverRan && !isSelfCheckFaultLatched()) {
    faultMotorLatched = 1;
    savePendingFaultReport(1);
    enterFaultLockState(flapHoldingOpenPosition());
#if F2_SERIAL_DEBUG
    Serial.println(F("FAULT motor no signal 10s"));
#endif
    clearBtnDetectSamples();
    return;
  }
  clearBtnDetectSamples();
}

// Pin5 十秒窗：电机工作=任一样本 A0<1023；堵转=A0 持续低于阈值（二者独立）
bool tickMotionA0Realtime(bool forceSample) {
  if (keyOffRetractBusy) return false;
  if (inBootSettle() || autoLevelBusy || reboundFaultLatched) return false;
  if (faultMotorLatched) return false;
  if (!motionCheckActive()) return false;
  if (item != 0 && item != 1) return false;
  if (btnDetectStartMs == 0) return false;

  unsigned long now = millis();
  unsigned long elapsed = now - btnDetectStartMs;

  if (elapsed > BTN_DETECT_WINDOW_MS) {
    finishBtnDetectWindow();
    return false;
  }

  if (elapsed < STALL_ARM_MS) return false;

  if (!forceSample && now - lastMotorSampleMs < BTN_DETECT_SAMPLE_MS) return false;
  lastMotorSampleMs = now;
  lastMotorRunSampleMs = now;

  int a0 = readMotorA0();
  lastMotorA0 = a0;
  motorRunSamples++;

  if (motorWorkCheckActive() && motorA0IndicatesRun(a0)) {
    motorRunHits++;
    if (motorRunHits >= BTN_MOTOR_RUN_HITS_NEED) {
      motorEverRan = 1;
      isRunning = 2;
    }
  } else if (!motorA0IndicatesRun(a0)) {
    motorRunHits = 0;
  }
  if (a0 < btnDetectA0Min) btnDetectA0Min = a0;

  if (!stallCheckActive()) {
    debugPrintMotionA0(a0);
    return false;
  }

  unsigned long sinceMotion = (openStartMs != 0) ? (now - openStartMs) : elapsed;
  if (sinceMotion < STALL_STARTUP_SHIELD_MS) {
    stuckCount = 0;
    debugPrintMotionA0(a0);
    return false;
  }

  if (a0 < BTN_STALL_A0_THR) {
    stuckCount++;
  } else if (a0 >= BTN_STALL_RELEASE_A0_THR) {
    stuckCount = 0;
  }

  if (stuckCount >= BTN_STALL_HITS_NEED) {
    btnDetectStartMs = 0;
    openStartMs = 0;
    stuckCount = 0;
#if F2_SERIAL_DEBUG
    Serial.print(F("STALL a0="));
    Serial.println(a0);
#endif
    if (item == 1) triggerStallRebound();
    else triggerStallDuringClose();
    return true;
  }

  debugPrintMotionA0(a0);
  return false;
}

bool sampleStallDuringOpen() {
  return tickMotionA0Realtime(true);
}

void selfCheckSampleMotor() {
  if (inBootSettle() || autoLevelBusy) return;
  if (!selfCheckMotionActive()) return;

  unsigned long now = millis();
  if (now - lastMotorSampleMs < stallSampleGapMs()) return;
  lastMotorSampleMs = now;

  lastMotorA0 = readMotorA0Burst();
}

bool inBootSettle() {
  return bootSettleUntil != 0 && millis() < bootSettleUntil;
}

// 按键 Pin5 需连续为低才认定按下，避免浮空误触发开机自检开合
bool pin5DebouncedLow(uint8_t needSamples) {
  for (uint8_t i = 0; i < needSamples; i++) {
    if (digitalRead(5) != LOW) return false;
    delayWithBlePoll(25);
  }
  return true;
}

// 开机自检前 Pin5 须先处于松开(高)，避免浮空一直被当成按住
static bool pin5BootWasReleased() {
  for (uint8_t i = 0; i < 8; i++) {
    if (digitalRead(5) == HIGH) return true;
    delayWithBlePoll(30);
  }
  return false;
}

unsigned long openGuardLimitMs() {
  if (reboundAttempt >= 1) return OPEN_GUARD_REBOUND_MS;
  return (pdSmooth == 1) ? OPEN_GUARD_SMOOTH_MS : OPEN_GUARD_MS;
}

int stallDetectThreshold() {
  int th = (judgeVal > 0) ? judgeVal : STALL_CURRENT_DEFAULT;
  if (reboundAttempt >= 1) {
    th += STALL_REBOUND_SENS_MARGIN;
    if (th > STALL_JUDGE_MAX) th = STALL_JUDGE_MAX;
  }
  return th;
}

int stallHitNeed() {
  return (reboundAttempt >= 1) ? STALL_REBOUND_HIT_NEED : STALL_HIT_NEED;
}

unsigned long stallSampleGapMs() {
  return (reboundAttempt >= 1) ? STALL_REBOUND_SAMPLE_GAP_MS : STALL_SAMPLE_GAP_MS;
}

void delayWithBlePoll(unsigned long ms) {
  unsigned long endAt = millis() + ms;
  unsigned long lastStatusInDelay = 0;
  while ((long)(millis() - endAt) < 0) {
    pollBleSerial();
    unsigned long now = millis();
    if (now - lastStatusInDelay >= 200UL) {
      lastStatusInDelay = now;
      sendStatusPacket();
    }
    tickStealthKeyWindow();
    btn5ServiceTick();
    btn5ServiceTick();
    watchdogFeed();
    updatePin9Power();
    if (!autoLevelBusy && btnDetectWindowActive()) {
      tickMotionA0Realtime(true);
    }
  }
}

void serviceInputsPoll() {
  btn5ServiceTick();
  watchdogFeed();
  updatePin9Power();
}

void watchdogFeed() {
  wdt_reset();
}

void watchdogBegin() {
  wdt_disable();
  wdt_enable(WDTO_8S);
}

// 关钥匙后 Pin9 须持续高电平至 pin9HoldUntil，期间 Pin2 抖动不得拉低 Pin9（否则整机断电）
unsigned long keyOffHoldDurationMs() {
  if (travelModeOn && item != 3) return (unsigned long)travelHoldMin * 60000UL;
  unsigned long ms = STEALTH_ENTRY_WINDOW_MS;
  if (delayPowerOffMin > 0) {
    ms += (unsigned long)delayPowerOffMin * 60000UL;
  }
  return ms;
}

#if F2_SERIAL_DEBUG
void debugLogPin9(const __FlashStringHelper *tag, uint8_t pin9Out) {
  unsigned long now = millis();
  unsigned long left = 0;
  if (pin9HoldUntil != 0 && now < pin9HoldUntil) left = pin9HoldUntil - now;
  Serial.print(F("[PIN9] "));
  Serial.print(tag);
  Serial.print(F(" ACC="));
  Serial.print(digitalRead(2));
  Serial.print(F(" OUT="));
  Serial.print(pin9Out);
  Serial.print(F(" holdMs="));
  Serial.print(left);
  Serial.print(F(" dpoMin="));
  Serial.print(delayPowerOffMin);
  Serial.print(F(" trv="));
  Serial.print(travelModeOn);
  Serial.print(F(" exp="));
  Serial.println(pin9HoldExpired);
}
#endif

void armPin9KeyOffHold() {
  unsigned long now = millis();
  stealthWindowStart = now;
  pin9HoldUntil = now + keyOffHoldDurationMs();
  pin9HoldExpired = 0;
#if F2_SERIAL_DEBUG
  debugLogPin9(F("ARM"), HIGH);
#endif
}

void releasePin9KeyOffHold() {
  pin9HoldUntil = 0;
  pin9HoldExpired = 0;
  stealthWindowStart = 0;
#if F2_SERIAL_DEBUG
  debugLogPin9(F("RELEASE"), HIGH);
#endif
}

// 钥匙回开：取消 Pin9 保持；再关钥匙时 tickStealthKeyWindow 会重新 arm 计时
void cancelKeyOffHoldOnKeyOn() {
  bool inHold = isKeyOffPin9HoldWindow() || pin9HoldExpired;
  if (!inHold) return;
  releasePin9KeyOffHold();
  updatePin9Power();
#if F2_SERIAL_DEBUG
  Serial.println(F("KEY on cancel hold"));
#endif
}

void expirePin9KeyOffHold() {
  pin9HoldUntil = 0;
  pin9HoldExpired = 1;
  stealthWindowStart = 0;
#if F2_SERIAL_DEBUG
  debugLogPin9(F("EXPIRE"), LOW);
#endif
}

bool isKeyOffPin9HoldWindow() {
  if (pin9HoldUntil == 0) return false;
  return (long)(millis() - pin9HoldUntil) < 0;
}

// 关钥匙倒计时进行中（10s + 延时断电分钟）
bool isKeyOffCountdownActive() {
  return stealthWindowStart != 0 && isKeyOffPin9HoldWindow();
}

// 倒计时内 2 号重新上电：软复位重跑 setup()；不用 WDT，避免旧 Nano bootloader 反复重启
void requestSoftwareReset() {
#if F2_SERIAL_DEBUG
  Serial.println(F("[RESET] key on during countdown"));
  Serial.flush();
#endif
  pinMode(9, OUTPUT);
  digitalWrite(9, HIGH);
  cli();
  MCUSR = 0;
  wdt_disable();
  asm volatile ("jmp 0");
  for (;;) { }
}

// 关钥匙后前 10 秒：可长按进隐蔽
bool isStealthEntryWindow() {
  if (!isKeyOffPin9HoldWindow() || stealthWindowStart == 0) return false;
  return (millis() - stealthWindowStart) < STEALTH_ENTRY_WINDOW_MS;
}

// 10 秒之后的可配置延时断电阶段：按键无效
bool isDelayPowerOffPhase() {
  if (!isKeyOffPin9HoldWindow() || stealthWindowStart == 0) return false;
  return (millis() - stealthWindowStart) >= STEALTH_ENTRY_WINDOW_MS;
}

// 关钥匙延时断电全程：禁止手动翻板；系统动作（关钥匙收回、堵转、开机）可 force 绕过
// 2 号必须为高（钥匙开）：引脚掉线/关钥匙时 Pin5 与蓝牙翻板均无效
bool canUserFlapControl() {
  if (isSelfCheckFaultLatched()) return false;
  if (item == 3 || autoLevelBusy) return false;
  return digitalRead(2) == HIGH;
}

// 长按进隐蔽：钥匙开随时可进；关钥匙后仅前 10 秒可进；延时断电阶段禁止
bool canEnterStealthViaBtn5() {
  if (isSelfCheckFaultLatched()) return false;
  if (item == 3 || autoLevelBusy) return false;
  if (isDelayPowerOffPhase()) return false;
  if (digitalRead(2) == HIGH) return true;
  return isStealthEntryWindow();
}

bool pin9HoldActiveNow() {
  return item == 3 || isKeyOffPin9HoldWindow();
}

void clampTravelConfig() {
  if (travelHoldMin < TRAVEL_HOLD_MIN_MIN || travelHoldMin > TRAVEL_HOLD_MIN_MAX) {
    travelHoldMin = TRAVEL_HOLD_MIN_DEFAULT;
  }
  if (travelAutoOffHours < TRAVEL_AUTO_OFF_H_MIN || travelAutoOffHours > TRAVEL_AUTO_OFF_H_MAX) {
    travelAutoOffHours = TRAVEL_AUTO_OFF_H_DEFAULT;
  }
}

uint16_t travelAutoOffLimitMin() {
  return (uint16_t)travelAutoOffHours * 60U;
}

void loadTravelConfigFromEeprom() {
  EEPROM.get(31, travelHoldMin);
  EEPROM.get(32, travelAutoOffHours);
  EEPROM.get(33, travelKeyOffRetractOn);
  if (travelHoldMin == 255) travelHoldMin = TRAVEL_HOLD_MIN_DEFAULT;
  if (travelAutoOffHours == 255) travelAutoOffHours = TRAVEL_AUTO_OFF_H_DEFAULT;
  if (travelKeyOffRetractOn != 0 && travelKeyOffRetractOn != 1) {
    travelKeyOffRetractOn = 0;
    EEPROM.put(33, (uint8_t)0);
  }
  clampTravelConfig();
}

void saveTravelHoldMin(uint8_t min) {
  travelHoldMin = min;
  clampTravelConfig();
  EEPROM.put(31, travelHoldMin);
}

void saveTravelAutoOffHours(uint8_t hours) {
  travelAutoOffHours = hours;
  clampTravelConfig();
  EEPROM.put(32, travelAutoOffHours);
}

void enableTravelMode() {
  if (item == 3) return;
  travelSavedDelayMin = delayPowerOffMin;
  EEPROM.put(19, travelSavedDelayMin);
  delayPowerOffMin = 0;
  EEPROM.put(15, delayPowerOffMin);
  travelModeOn = 1;
  travelElapsedMin = 0;
  travelMinuteMark = millis();
  EEPROM.put(17, travelModeOn);
  EEPROM.put(21, travelElapsedMin);
  blinkPin8(3, 100, 100);
#if F2_SERIAL_DEBUG
  Serial.println(F("TRAVEL on"));
#endif
}

void disableTravelMode() {
  travelModeOn = 0;
  travelKeyOnRestoreOpen = 0;
  travelElapsedMin = 0;
  EEPROM.put(17, travelModeOn);
  EEPROM.put(21, travelElapsedMin);
  int restore = travelSavedDelayMin;
  if (restore <= 0) restore = TRAVEL_DEFAULT_DELAY_MIN;
  delayPowerOffMin = restore;
  EEPROM.put(15, delayPowerOffMin);
  blinkPin8(3, 100, 100);
#if F2_SERIAL_DEBUG
  Serial.println(F("TRAVEL off"));
#endif
}

void tickTravelMinute() {
  if (!travelModeOn || item == 3) return;
  if (travelMinuteMark == 0) travelMinuteMark = millis();
  if (millis() - travelMinuteMark < 60000UL) return;
  travelMinuteMark += 60000UL;
  travelElapsedMin++;
  if (travelElapsedMin >= travelAutoOffLimitMin()) {
    disableTravelMode();
  } else {
    EEPROM.put(21, travelElapsedMin);
  }
}

// 2 号持续低电平超过 KEY_OFF_DEBOUNCE_MS 才视为真关钥匙
bool pin2KeyOffStable() {
  bool high = digitalRead(2) == HIGH;
  if (high) {
    pin2LowSince = 0;
    return false;
  }
  unsigned long now = millis();
  if (pin2LowSince == 0) pin2LowSince = now;
  return (now - pin2LowSince) >= KEY_OFF_DEBOUNCE_MS;
}

// 2 号持续高电平超过 KEY_ON_DEBOUNCE_MS 才视为真开钥匙（取消 Pin9 保持）
bool pin2KeyOnStable() {
  bool high = digitalRead(2) == HIGH;
  if (!high) {
    pin2HighSince = 0;
    return false;
  }
  unsigned long now = millis();
  if (pin2HighSince == 0) pin2HighSince = now;
  return (now - pin2HighSince) >= KEY_ON_DEBOUNCE_MS;
}

static void tickKeyOffServoIdlePwm() {
  if (!isKeyOffPin9HoldWindow()) return;
  if (digitalRead(2) != LOW) return;
  if (keyOffRetractBusy) return;
  if (openEaseActive || smoothMotionRunning() || flapMotionMoving()) return;
  if (!servoPwmOff) {
    servoStopHold();
  }
}

// 关钥匙沿：出行模式再开钥匙 → 下翻（展开）；非出行 → 软复位走平时开机设置
void tickStealthKeyWindow() {
  bool pin2High = digitalRead(2) == HIGH;

  // 隐蔽模式：Pin2 关钥匙/接钥匙均不干预（与出行关钥匙逻辑隔离）
  if (item == 3) {
    if (!pin2EdgeInit) {
      lastPin2High = pin2High;
      pin2EdgeInit = 1;
    } else {
      lastPin2High = pin2High;
    }
    return;
  }

  if (!pin2EdgeInit) {
    lastPin2High = pin2High;
    pin2EdgeInit = 1;
  }

  if (pin2KeyOnStable()) {
    keyOffFoldHandled = false;
    keyOffRetractIssued = 0;
    pin2SeenHighSinceBoot = 1;
    pendingKeyOffFold = 0;
    keyOffRetractBusy = 0;
  }

  if (!inBootSettle()) {
    // 2 号下降沿：立即启动 Pin9 延时断电（与关机收回/保持无关；不等关钥匙防抖）
    if (lastPin2High && !pin2High && !isSelfCheckFaultLatched()) {
      keyDbgKv(F("KEY_FALL"), item, accRetractOn);
      keyOffFoldHandled = false;
      armPin9KeyOffHold();
      updatePin9Power();
    }

    // 收牌须 2 号稳定关断后再动舵机；冷启动钥匙一直关着不算一次「关钥匙」
    if (pin2KeyOffStable() && !keyOffFoldHandled && keyOffRetractEligible()) {
      keyOffFoldHandled = true;
      if (!isSelfCheckFaultLatched()) {
        if (keyOffRetractEnabled() && item != 0 && item != 3 && !autoLevelBusy) {
          keyDbgLine(F("KEY_OFF_RETRACT"));
          requestFlapClose(false);
        } else if (keyOffRetractEnabled() && item != 0 && item != 3 && autoLevelBusy) {
          keyDbgLine(F("KEY_OFF_FOLD_PENDING"));
          pendingKeyOffFold = 1;
        } else if (!keyOffRetractEnabled()) {
          statusLedUpdate();
        }
      }
      updatePin9Power();
    }
  } else if (pin2KeyOffStable() && !keyOffFoldHandled && keyOffRetractEligible() &&
             keyOffRetractEnabled() && item == 1) {
    keyDbgLine(F("KEY_OFF_BLOCKED_BOOT_SETTLE"));
  }

  // 开机保护期内关钥匙会漏掉下降沿：出保护后若仍关钥匙且本轮曾开过，补 arm 一次
  if (!inBootSettle() && !isSelfCheckFaultLatched() && pin2KeyOffStable() && pin2SeenHighSinceBoot
      && pin9HoldUntil == 0 && !pin9HoldExpired) {
    keyDbgLine(F("KEY_OFF_ARM_CATCHUP"));
    armPin9KeyOffHold();
    updatePin9Power();
  }

  if (pin2KeyOnStable() && (isKeyOffCountdownActive() || pin9HoldExpired)) {
    // 出行模式：不软复位；保持/收回均在下钥匙后接钥匙 → 下翻（未展开时）
    if (travelModeOn && item != 3) {
      if (!isSelfCheckFaultLatched() && !autoLevelBusy && !inBootSettle()
          && item != 1) {
        keyDbgLine(F("TRAVEL_KEY_ON_OPEN"));
        requestFlapOpen(false);
        lastStatusSend = 0;
        sendStatusPacket();
      }
      travelKeyOnRestoreOpen = 0;
      keyDbgLine(F("KEY_ON_CANCEL_HOLD"));
      cancelKeyOffHoldOnKeyOn();
      updatePin9Power();
    } else if (item == 3) {
      cancelKeyOffHoldOnKeyOn();
      updatePin9Power();
    } else {
      // 非出行：延时断电内 ACC 接回 → 软复位，重跑开机上/下翻
      keyDbgKv(F("KEY_ON_SOFT_RESET"), item, powerOnFlip);
      requestSoftwareReset();
    }
  }

  lastPin2High = pin2High;
}

/* =============================================================================
 * BLOCK: Stealth mode — 隐蔽模式（进入后折回、Pin9 保持 3h；Pin2/蓝牙翻板无效）
 * ============================================================================= */
static void stealthFoldToItem4Blocking();
static void finishStealthSession(uint8_t autoPowerOff);

static void stealthAckBlink(uint8_t times) {
  for (uint8_t i = 0; i < times; i++) {
    digitalWrite(8, HIGH);
    delayWithBlePoll((unsigned long)STEALTH_ACK_ON_MS);
    digitalWrite(8, LOW);
    if (i + 1 < times) {
      delayWithBlePoll((unsigned long)STEALTH_ACK_OFF_MS);
    }
  }
}

void enterStealthMode() {
  if (item == 3) return;
  if (travelModeOn) {
    disableTravelMode();
  }

  travelKeyOnRestoreOpen = 0;
  reboundWaitUntil = 0;
  reboundAttempt = 0;
  foldAdjustActive = 0;
  pendingKeyOffFold = 0;
  keyOffRetractBusy = 0;

  releasePin9KeyOffHold();
  digitalWrite(9, HIGH);

  digitalWrite(8, HIGH);
  stealthAckBlink(3);

  stealthFoldToItem4Blocking();

  item = 3;
  stealthActive = 1;
  stealthElapsedMin = 0;
  stealthMinuteMark = millis();

  invalidateServoHold();
  foldHoldActive = 1;
  openEaseActive = 0;
  forceServoMove = 0;
  servoStopHold();
  digitalWrite(8, LOW);
  updatePin9Power();
#if F2_SERIAL_DEBUG
  Serial.println(F("STEALTH enter"));
#endif
}

static void finishStealthSession(uint8_t autoPowerOff) {
  stealthActive = 0;
  item = 0;
  stealthElapsedMin = 0;
  stealthMinuteMark = 0;
  invalidateServoHold();
  foldHoldActive = 1;
  forceServoMove = 0;
  releasePin9KeyOffHold();
  if (autoPowerOff && digitalRead(2) == LOW) {
    expirePin9KeyOffHold();
    digitalWrite(9, LOW);
  }
  updatePin9Power();
  statusLedUpdate();
  btn5NoteStealthExited();
}

void exitStealthMode() {
  digitalWrite(8, HIGH);
  stealthAckBlink(5);
  finishStealthSession(0);
#if F2_SERIAL_DEBUG
  Serial.println(F("STEALTH exit"));
#endif
}

static void stealthAutoPowerOff() {
  finishStealthSession(1);
#if F2_SERIAL_DEBUG
  Serial.println(F("STEALTH auto off 3h"));
#endif
}

void tickStealthMinute() {
  if (item != 3 || !stealthActive) return;
  if (stealthMinuteMark == 0) stealthMinuteMark = millis();
  if (millis() - stealthMinuteMark < 60000UL) return;
  stealthMinuteMark += 60000UL;
  stealthElapsedMin++;
  if (stealthElapsedMin >= STEALTH_AUTO_OFF_MIN) {
    stealthAutoPowerOff();
  }
}

// Pin9 默认高电平供电；仅延时断电到期（或故障锁死且钥匙关）才拉低
void updatePin9Power() {
  unsigned long now = millis();
#if F2_SERIAL_DEBUG
  static uint8_t faultPin9Logged = 0;
#endif

  if (inBootSettle()) {
    digitalWrite(9, HIGH);
    return;
  }

  // 隐蔽模式：Pin9 全程保持高电平，不受延时断电/关钥匙影响
  if (item == 3 && stealthActive) {
    pin9HoldUntil = 0;
    pin9HoldExpired = 0;
    stealthWindowStart = 0;
    digitalWrite(9, HIGH);
    return;
  }

  if (isSelfCheckFaultLatched() && digitalRead(2) == LOW) {
    pin9HoldUntil = 0;
    pin9HoldExpired = 0;
    digitalWrite(9, LOW);
#if F2_SERIAL_DEBUG
    if (!faultPin9Logged) {
      faultPin9Logged = 1;
      debugLogPin9(F("FAULT_LOCK"), LOW);
    }
#endif
    return;
  }
#if F2_SERIAL_DEBUG
  faultPin9Logged = 0;
#endif

  if (pin9HoldUntil != 0 && (long)(now - pin9HoldUntil) >= 0) {
    expirePin9KeyOffHold();
  }

  uint8_t level = HIGH;
#if F2_SERIAL_DEBUG
  const __FlashStringHelper *tag = F("PWR_ON");
#endif

  if (pin9HoldExpired && digitalRead(2) == LOW) {
    level = LOW;
#if F2_SERIAL_DEBUG
    tag = F("PWR_CUT");
#endif
  } else if (isKeyOffPin9HoldWindow()) {
#if F2_SERIAL_DEBUG
    tag = F("HOLD_WIN");
#endif
  }

  static uint8_t lastLevel = 255;
  digitalWrite(9, level);
#if F2_SERIAL_DEBUG
  if (level != lastLevel) {
    lastLevel = level;
    debugLogPin9(tag, level);
  }
#endif
}

// Pin9 断电看门狗：补到期判定 + 到期后强制拉低（防主逻辑漏执行）
void tickPin9PowerWatchdog() {
  if (inBootSettle()) return;

  if (item == 3 && stealthActive) {
    if (digitalRead(9) != HIGH) {
      digitalWrite(9, HIGH);
      keyDbgLine(F("PIN9_WDT_STEALTH"));
    }
    return;
  }

  unsigned long now = millis();
  if (pin9HoldUntil != 0 && (long)(now - pin9HoldUntil) >= 0) {
    expirePin9KeyOffHold();
  }

  if (isSelfCheckFaultLatched() && digitalRead(2) == LOW) {
    if (digitalRead(9) != LOW) {
      digitalWrite(9, LOW);
      keyDbgLine(F("PIN9_WDT_FAULT"));
    }
    return;
  }

  bool shouldCut = false;
  if (pin9HoldExpired && digitalRead(2) == LOW) {
    shouldCut = true;
  }

  if (shouldCut && digitalRead(9) != LOW) {
    digitalWrite(9, LOW);
    keyDbgLine(F("PIN9_WDT_CUT"));
  }
}

// 打开收回：关钥匙期间确保折回到 item4；运动交给 updateServoOutput 平滑处理
void tickAccRetractJudge() {
  if (isSelfCheckFaultLatched()) return;
  if (inBootSettle()) return;
  if (item == 3) return;
  if (!keyOffRetractEnabled()) return;
  if (!pin2KeyOffStable()) return;
  if (!keyOffRetractEligible()) return;
  if (keyOffRetractIssued) return;

  keyOffRetractIssued = 1;
  if (item == 1 || openEaseActive || smoothMotionRunning() || flapCloseMoving()) {
    requestFlapClose(false);
    return;
  }
  if (item == 0 && !flapPhysicallyAtFold()) {
    requestFlapClose(false);
  }
}

int readServoAngle() {
  // 仅在 PWM 有效时信任 servo.read()（库指令角）；断 PWM 后 read 仍可能是默认 90°
  if (!servoPwmOff && (forceServoMove || openEaseActive || reboundAttempt >= 1)) {
    int live = servo.read();
    if (live >= 0 && live <= 180) return live;
  }
  if (lastWrittenAngle >= 0 && lastWrittenAngle <= 180) return lastWrittenAngle;
  if (!servoPwmOff) {
    int live = servo.read();
    if (live >= 0 && live <= 180) return live;
  }
  // 无历史角：回退折叠位，绝不回退库默认 90°
  if (item4 >= 0 && item4 <= 180) return item4;
  return -1;
}

// 舵机已 attach 时读物理角；PWM 已断则回退逻辑角
static int readServoAngleLive() {
  if (!servoPwmOff) {
    int live = servo.read();
    if (live >= 0 && live <= 180) return live;
  }
  return readServoAngle();
}

/* =============================================================================
 * BLOCK: Status LED (Pin8) — 翻开亮 / 折回灭；故障时由 tickFaultAlarm 闪烁
 * ============================================================================= */
bool faultIndicatorActive() {
  if (reboundFaultLatched || faultMotorLatched) return true;
  return pendingFaultReport > 0;
}

void statusLedUpdate() {
  if (item == 3) {
    if (!faultIndicatorActive()) digitalWrite(8, LOW);
    return;
  }
  if (faultIndicatorActive()) {
    return;
  }
  // 小程序「调整折叠角度」：与旧版一致，调整过程中指示灯常亮
  if (foldAdjustActive) {
    digitalWrite(8, HIGH);
    return;
  }
  // 关机保持(accRetractOn=0)：2号稳定关断时翻板不动，但指示灯须立刻灭
  // 出行模式不看 accRetractOn，关钥匙同样灭灯
  if (pin2KeyOffStable()) {
    if ((travelModeOn && item != 3) || accRetractOn != 1) {
      digitalWrite(8, LOW);
      return;
    }
  }
  digitalWrite(8, (item == 1) ? HIGH : LOW);
}

void blinkPin8(uint8_t times, int onMs, int offMs) {
  for (uint8_t i = 0; i < times; i++) {
    digitalWrite(8, HIGH);
    delayWithBlePoll((unsigned long)onMs);
    digitalWrite(8, LOW);
    delayWithBlePoll((unsigned long)offMs);
  }
  statusLedUpdate();
}

void invalidateServoHold() {
  servoTrackItem = -1;
  servoTrackAngle = -1;
  foldHoldActive = 0;
  flapSettleUntil = 0;
  servoCancelPwmHold();
  smoothMotionAbort();
}

void abortOpenMotion() {
  openEaseActive = 0;
  flapSettleUntil = 0;
  smoothMotionAbort();
}

// 堵转反弹后第二次试探打开：单一目标角匀速逼近，避免逐步改角导致舵机回拉
void writeServoReboundEase(int target) {
  int startAngle = readServoAngle();
  if (startAngle == target) {
    reboundAttempt = 0;
    servoReleaseAtTarget(target);
    return;
  }
  servoPrepareMove();
  openEaseActive = 1;
  lastWrittenAngle = startAngle;
  bool arrived = false;

#if F2_VARSERVO
  unsigned long deadline = millis() +
    (unsigned long)abs(target - startAngle) * REBOUND_EASE_MS_PER_DEG + 800UL;
  while (millis() < deadline) {
    if (item != 1) {
      openEaseActive = 0;
      return;
    }
    int pos = servo.read();
    if (pos >= 0) {
      if (abs(pos - target) <= 2) {
        arrived = true;
        lastWrittenAngle = pos;
        break;
      }
      lastWrittenAngle = pos;
    }
    int distLeft = (pos >= 0) ? abs(target - pos) : abs(target - startAngle);
    uint8_t spd = getUserServoSpeedByte();
    if (spd < scaleServoSpeed(REBOUND_EASE_SPEED_CRUISE)) {
      spd = scaleServoSpeed(REBOUND_EASE_SPEED_CRUISE);
    }
    if (distLeft <= REBOUND_EASE_TAIL_DEG) {
      uint8_t tailSpd = scaleServoSpeed(REBOUND_EASE_SPEED_TAIL +
        (uint8_t)((long)(REBOUND_EASE_SPEED_CRUISE - REBOUND_EASE_SPEED_TAIL) *
          distLeft / REBOUND_EASE_TAIL_DEG));
      if (tailSpd > spd) spd = tailSpd;
    }
    servo.write(target, spd);
    delayWithBlePoll(REBOUND_EASE_POLL_MS);
    pollBleSerial();
    btn5ServiceTick();
    if (item != 1) {
      openEaseActive = 0;
      return;
    }
    if (sampleStallDuringOpen()) {
      openEaseActive = 0;
      return;
    }
  }
#else
  int cur = startAngle;
  int dir = (target > cur) ? 1 : -1;
  while (cur != target) {
    if (item != 1) {
      openEaseActive = 0;
      return;
    }
    cur += dir;
    servo.write(cur);
    lastWrittenAngle = cur;
    delayWithBlePoll(REBOUND_EASE_STEP_MS);
    pollBleSerial();
    btn5ServiceTick();
    if (item != 1) {
      openEaseActive = 0;
      return;
    }
    if (sampleStallDuringOpen()) {
      openEaseActive = 0;
      return;
    }
  }
  arrived = true;
#endif

  openEaseActive = 0;
  if (!arrived) {
    if (item == 1) triggerStallRebound();
    return;
  }
  if (item != 1) return;
  lastWrittenAngle = target;
  servoTrackItem = item;
  servoTrackAngle = target;
  reboundAttempt = 0;
  servoFinalizePosition(target);
}

/* =============================================================================
 * BLOCK: Self-check during smooth move — 仅采样/堵转，不改平滑速度曲线
 * ============================================================================= */
static bool easeMotionSelfCheckPoll(int motionItem) {
  if (keyOffRetractBusy) return false;
  if (!btnDetectWindowActive()) return false;
  if (motionItem != 0 && motionItem != 1) return false;
  if (item != motionItem) return false;
  if (tickMotionA0Realtime(true)) {
    openEaseActive = 0;
    statusLedUpdate();
    return true;
  }
  if (isSelfCheckFaultLatched()) {
    openEaseActive = 0;
    statusLedUpdate();
    return true;
  }
  return false;
}

static void easeMotionSelfCheckFinish(int motionItem) {
  (void)motionItem;
}

/* =============================================================================
 * BLOCK: Smooth motion — 前段全速，末 28% 慢步微贴（打开/折回同一逻辑）
 * ============================================================================= */
static uint8_t getSmoothTailSpeedByte() {
  uint16_t tail = (uint16_t)getUserServoSpeedByte() / 4U;
  if (tail < 9) tail = 9;
  return (uint8_t)tail;
}

// 末段匀速微贴目标（PWM 固定，不随剩余行程渐变）
static uint8_t smoothStepSpeedForDist(int dist, int tailSpan) {
  (void)dist;
  (void)tailSpan;
  return getSmoothTailSpeedByte();
}

static unsigned int smoothTailStepMs() {
  return scaleMoveDelayMs(SMOOTH_TAIL_STEP_MS);
}

static bool smoothInTailZone(int pos, int target, int tailSpan) {
  if (tailSpan < 1) tailSpan = 1;
  return abs(target - pos) <= tailSpan;
}

// 仅过滤「起点未动、read 一次跳进尾段区」的假读数（boot 直写后首折）；正常巡航仍跟 live
static bool smoothLiveReadGlitch(int live) {
  if (live < 0 || live > 180) return false;
  if (smoothCurrent < 0 || smoothCurrent > 180) return false;
  int span = abs(smoothTarget - smoothMoveStart);
  if (span < 1) return false;
  int tracked = abs(smoothCurrent - smoothMoveStart);
  int jumpFromStart = abs(live - smoothMoveStart);
  if (tracked > SMOOTH_LIVE_JUMP_MAX_DEG) return false;
  if (jumpFromStart <= span / 2) return false;
  if (abs(live - smoothCurrent) <= SMOOTH_LIVE_JUMP_MAX_DEG) return false;
  if (!smoothInTailZone(live, smoothTarget, smoothTailSpanStored)) return false;
  return true;
}

static int smoothTailSpanFor(int span) {
  if (span <= 1) return span;
  int tail = (span * SMOOTH_TAIL_PCT + 50) / 100;
  if (tail < SMOOTH_TAIL_MIN_DEG) tail = SMOOTH_TAIL_MIN_DEG;
  if (tail >= span) tail = span - 1;
  return tail;
}

static int smoothPosNow() {
  if (smoothPhase != 0 && smoothCurrent >= 0 && smoothCurrent <= 180) {
    return smoothCurrent;
  }
  if (lastWrittenAngle >= 0 && lastWrittenAngle <= 180) {
    return lastWrittenAngle;
  }
  return -1;
}

static void smoothStartCruise(int start, int target) {
  int span = abs(target - start);
  int tailSpan = smoothTailSpanFor(span);
  int dir = (target > start) ? 1 : -1;
  smoothCruiseEnd = target - dir * tailSpan;
  smoothCurrent = start;
  smoothMoveStart = start;
  smoothTailSpanStored = tailSpan;

  if (span <= tailSpan) {
    smoothPhase = 2;
    smoothLastTick = 0;
    servoAttachForMove();
    servoPrepareMove();
    return;
  }

  servoPrepareMove();
  servoWriteEaseStep(smoothCruiseEnd, getUserServoSpeedByte());
  unsigned long cruiseMs = (unsigned long)(span - tailSpan) * SMOOTH_CRUISE_MS_PER_DEG + 180UL;
  if (cruiseMs > 6000UL) cruiseMs = 6000UL;
  cruiseMs = scaleMoveDelayMs((unsigned int)cruiseMs);
  smoothPhase = 1;
  smoothPhaseUntil = millis() + cruiseMs;
  smoothLastTick = 0;
  forceServoMove = 0;
}

// 折叠微调：不经平滑，由 tickFlapServoHold 非阻塞执行
void writeServoDirect(int angle) {
  if (item == 3) return;
  if (angle < 0) angle = 0;
  if (angle > 180) angle = 180;
  smoothMotionAbort();
  flapSettleUntil = 0;
  forceServoMove = 1;
  servoTrackItem = -1;
  servoTrackAngle = angle;
}

bool smoothMotionRunning() {
  return smoothPhase != 0;
}

void smoothMotionAbort() {
  smoothPhase = 0;
  smoothTarget = 0;
  smoothMotionItem = -1;
  smoothCurrent = -1;
  smoothCruiseEnd = 0;
  smoothMoveStart = 0;
  smoothTailSpanStored = 0;
  smoothPhaseUntil = 0;
  smoothLastTick = 0;
  if (openEaseActive) openEaseActive = 0;
}

void smoothMotionBegin(int target) {
  if (target < 0) target = 0;
  if (target > 180) target = 180;
  if (item != 0 && item != 1) return;

  if (smoothPhase != 0 && smoothTarget == target && smoothMotionItem == item && !forceServoMove) {
    return;
  }

  int start = smoothPosNow();
  if (start < 0 || start > 180 || smoothMotionItem != item) {
    start = lastWrittenAngle;
    if (start < 0 || start > 180) {
      int live = readServoAngleLive();
      if (live >= 0 && live <= 180) start = live;
      else start = (item == 1) ? item4 : bianlaing;
      if (start < 0 || start > 180) start = target;
    }
  }

  if (forceServoMove) {
    int live = readServoAngleLive();
    if (live >= 0 && live <= 180) start = live;
  }

  if (start == target && !forceServoMove) {
    smoothMotionAbort();
    lastWrittenAngle = target;
    servoTrackItem = item;
    servoTrackAngle = target;
    if (item == 0) foldHoldActive = 1;
    else foldHoldActive = 0;
    servoFinalizePosition(target);
    return;
  }

  uint8_t wasRunning = (smoothPhase != 0) ? 1 : 0;
  openEaseActive = 1;
  smoothMotionItem = item;
  smoothTarget = target;
  flapSettleUntil = 0;
  foldHoldActive = 0;
  servoTrackItem = item;
  servoTrackAngle = target;
  servoAttachForMove();
  if (!wasRunning || servoPwmOff) {
    servoPrepareMove();
  }
  smoothStartCruise(start, target);
}

void tickSmoothServoMotion(int target) {
  if (target < 0) target = 0;
  if (target > 180) target = 180;

  if (item != 0 && item != 1) {
    smoothMotionAbort();
    return;
  }

  if (smoothPhase == 0) {
    if (servoMoveCommitted(target) && servoPwmOff && !forceServoMove) {
      if (item == 0) foldHoldActive = 1;
      else foldHoldActive = 0;
      return;
    }
    smoothMotionBegin(target);
    if (smoothPhase == 0) return;
  }

  if (item != smoothMotionItem || target != smoothTarget) {
    smoothMotionBegin(target);
    if (smoothPhase == 0) return;
  }

  if (easeMotionSelfCheckPoll(smoothMotionItem)) {
    smoothMotionAbort();
    return;
  }

  unsigned long now = millis();

  // 段 3：到位后短暂等待再断 PWM
  if (smoothPhase == 3) {
    if (flapSettleUntil != 0 && (long)(now - flapSettleUntil) < 0) {
      if (selfCheckOn == 1 && btnDetectWindowActive()) {
        tickMotionA0Realtime(true);
      }
      return;
    }
    flapSettleUntil = 0;
    if (!isSelfCheckFaultLatched()) {
      servoFinalizePosition(smoothTarget);
      lastWrittenAngle = smoothTarget;
      smoothCurrent = smoothTarget;
      servoTrackItem = item;
      servoTrackAngle = smoothTarget;
    }
    smoothPhase = 0;
    smoothCurrent = -1;
    openEaseActive = 0;
    forceServoMove = 0;
    if (smoothMotionItem == 0) foldHoldActive = 1;
    else foldHoldActive = 0;
    statusLedUpdate();
    easeMotionSelfCheckFinish(smoothMotionItem);
    return;
  }

  // 段 1：主程一次 write 到 cruise 终点；计时或进入尾段区后切 phase2
  if (smoothPhase == 1) {
    int live = readServoAngleLive();
    if (smoothCurrent < 0 || smoothCurrent > 180) {
      smoothCurrent = smoothMoveStart;
    }
    if (live >= 0 && live <= 180 && !smoothLiveReadGlitch(live)) {
      smoothCurrent = live;
      lastWrittenAngle = live;
    }

    if (smoothInTailZone(smoothCurrent, smoothTarget, smoothTailSpanStored)
        || (long)(now - smoothPhaseUntil) >= 0) {
      live = readServoAngleLive();
      if (live >= 0 && live <= 180) {
        smoothCurrent = live;
        lastWrittenAngle = live;
      }
      smoothPhase = 2;
      smoothLastTick = 0;
    } else {
      return;
    }
  }

  // 段 2：末段匀速微贴目标
  if (smoothPhase == 2) {
    int dist = abs(smoothTarget - smoothCurrent);
    if (dist == 0) {
      smoothPhase = 3;
      flapSettleUntil = now + 200UL;
      return;
    }
    if (smoothLastTick != 0 && (now - smoothLastTick) < smoothTailStepMs()) {
      return;
    }
    smoothLastTick = now;

    int dir = (smoothTarget > smoothCurrent) ? 1 : -1;
    int next = smoothCurrent + dir;
    if ((dir > 0 && next > smoothTarget) || (dir < 0 && next < smoothTarget)) {
      next = smoothTarget;
    }

    if (servoPwmOff) {
      servoPrepareMove();
    }
    int distAfter = abs(smoothTarget - next);
    servoWriteEaseStep(next, smoothStepSpeedForDist(distAfter, smoothTailSpanStored));
    smoothCurrent = next;
    lastWrittenAngle = next;
    servoTrackItem = item;
    servoTrackAngle = smoothTarget;

    if (next == smoothTarget) {
      smoothPhase = 3;
      flapSettleUntil = now + 200UL;
    }
    return;
  }
}

void writeServoEase(int target) {
  smoothMotionBegin(target);
}

static void waitServoReach(int angle) {
  unsigned long deadline = millis() + 12000UL;
  while (!servoMoveCommitted(angle) && !isSelfCheckFaultLatched() && (long)(millis() - deadline) < 0) {
    if (item == 0 || item == 1) updateServoOutput();
    pollBleSerial();
    btn5ServiceTick();
    watchdogFeed();
    tickStealthKeyWindow();
    updatePin9Power();
    delayWithBlePoll(16);
  }
  while (smoothMotionRunning() && !isSelfCheckFaultLatched() && (long)(millis() - deadline) < 0) {
    if (item == 0 || item == 1) updateServoOutput();
    pollBleSerial();
    btn5ServiceTick();
    watchdogFeed();
    tickStealthKeyWindow();
    updatePin9Power();
    delayWithBlePoll(16);
  }
}

// 进入隐蔽前：与出行关钥匙收回一样，阻塞折回到 item4
static void stealthFoldToItem4Blocking() {
  if (item == 0 && flapPhysicallyAtFold()) {
    lastWrittenAngle = item4;
    servoTrackItem = 0;
    servoTrackAngle = item4;
    foldHoldActive = 1;
    return;
  }

  abortOpenMotion();
  reboundWaitUntil = 0;
  reboundRetryClose = 0;
  foldAdjustActive = 0;
  item = 0;
  foldHoldActive = 0;
  forceServoMove = 1;
  invalidateServoHold();
  statusLedUpdate();

  int cur = readServoAngleLive();
  if (cur < 0 || cur > 180) {
    cur = lastWrittenAngle;
    if (cur < 0 || cur > 180) cur = bianlaing;
  }
  lastWrittenAngle = cur;

  if (pdSmooth == 1) {
    smoothMotionBegin(item4);
  } else {
    writeServoDirect(item4);
  }
  waitServoReach(item4);
  waitServoSettle(item4);
  forceServoMove = 0;

  if (!isSelfCheckFaultLatched()) {
    servoFinalizePosition(item4);
    lastWrittenAngle = item4;
    servoTrackItem = 0;
    servoTrackAngle = item4;
    foldHoldActive = 1;
  }
}

bool servoAtAngle(int angle) {
  return lastWrittenAngle >= 0 && lastWrittenAngle == angle;
}

bool servoMoveCommitted(int angle) {
  return servoAtAngle(angle) && servoTrackItem == item && servoTrackAngle == angle;
}

void writeServo(int angle) {
  if (item == 3) return;
  if (angle < 0) angle = 0;
  if (angle > 180) angle = 180;

  if (reboundAttempt >= 1 && item == 1 && angle == bianlaing) {
    if (pdSmooth == 1) {
      smoothMotionBegin(angle);
    } else {
      forceServoMove = 1;
      servoPrepareMove();
#if F2_VARSERVO
      servo.write(angle, getUserServoSpeedByte());
#else
      servo.write(angle);
#endif
      lastWrittenAngle = angle;
      servoTrackItem = item;
      servoTrackAngle = angle;
      foldHoldActive = 0;
      unsigned long settleEnd = millis() +
        (unsigned long)abs(angle - readServoAngle()) * 28UL + 400UL;
      while (millis() < settleEnd) {
        if (item != 1) return;
        delayWithBlePoll(20);
        pollBleSerial();
        btn5ServiceTick();
        if (sampleStallDuringOpen()) return;
      }
      if (item != 1) return;
      if (isSelfCheckFaultLatched()) return;
      servoFinalizePosition(angle);
    }
    if (servoAtAngle(angle) && !openEaseActive && !smoothMotionRunning() && item == 1) {
      servoTrackItem = item;
      servoTrackAngle = angle;
      foldHoldActive = 0;
      reboundAttempt = 0;
    }
    return;
  }

  if (!forceServoMove && servoMoveCommitted(angle)) {
    servoTrackItem = item;
    servoTrackAngle = angle;
    if (item == 0) foldHoldActive = 1;
    else foldHoldActive = 0;
    servoSchedulePwmRelease();
    return;
  }

  bool flapOpen = (item == 1 && angle == bianlaing);
  bool flapClose = (item == 0 && angle == item4);

  if (flapClose && f1FoldShouldDetour()) {
    f1BeginFoldDetourMotion();
    return;
  }

  if (pdSmooth == 1 && (flapOpen || flapClose)) {
    smoothMotionBegin(angle);
    return;
  }

  smoothMotionAbort();
  forceServoMove = 1;
  servoTrackItem = -1;
  servoTrackAngle = angle;
  flapSettleUntil = 0;
}

static bool f1FoldShouldDetour() {
  return foldDetourArmed != 0 && !foldAdjustActive;
}

static void f1FoldDetourWriteNow(int angle) {
  if (angle < 0) angle = 0;
  if (angle > 180) angle = 180;
  servoPrepareMove();
#if F2_VARSERVO
  servo.write(angle, 255);
#else
  servo.write(angle);
#endif
  lastWrittenAngle = angle;
  servoTrackItem = item;
  servoTrackAngle = angle;
  flapSettleUntil = 0;
  foldHoldActive = 0;
  forceServoMove = 1;
}

static void f1BeginFoldDetourMotion() {
  if (!f1FoldShouldDetour()) return;
  foldDetourPhase = 1;
  foldDetourHoldUntil = 0;
  forceServoMove = 1;
  openStartMs = millis();
  stuckCount = 0;
  invalidateServoHold();
  if (pdSmooth == 1) {
    smoothMotionBegin(F1_FOLD_DETOUR_ANGLE);
  } else {
    f1FoldDetourWriteNow(F1_FOLD_DETOUR_ANGLE);
  }
}

static void f1FoldDetourAbort() {
  foldDetourPhase = 0;
  foldDetourHoldUntil = 0;
}

static void f1FoldDetourArmOnOpen() {
  foldDetourArmed = 1;
  f1FoldDetourAbort();
}

// phase1→180 phase2停1s phase3→item4；开平滑时 phase1/3 走 tickSmoothServoMotion
static bool f1UpdateFoldDetour() {
  if (item != 0 || foldDetourPhase == 0) return false;

  if (foldDetourPhase == 1) {
    if (pdSmooth == 1) {
      tickSmoothServoMotion(F1_FOLD_DETOUR_ANGLE);
      if (!smoothMotionRunning()) {
        int live = readServoAngleLive();
        if (live >= 0 && abs(live - F1_FOLD_DETOUR_ANGLE) <= 5) {
          foldDetourPhase = 2;
          foldDetourHoldUntil = millis() + F1_FOLD_DETOUR_HOLD_MS;
        }
      }
    } else {
      f1FoldDetourWriteNow(F1_FOLD_DETOUR_ANGLE);
      int live = readServoAngleLive();
      if (live >= 0 && abs(live - F1_FOLD_DETOUR_ANGLE) <= 5) {
        foldDetourPhase = 2;
        foldDetourHoldUntil = millis() + F1_FOLD_DETOUR_HOLD_MS;
      }
    }
    return true;
  }

  if (foldDetourPhase == 2) {
    f1FoldDetourWriteNow(F1_FOLD_DETOUR_ANGLE);
    if (millis() >= foldDetourHoldUntil) {
      foldDetourArmed = 0;
      foldDetourPhase = 3;
      forceServoMove = 1;
      if (pdSmooth == 1) {
        smoothMotionBegin(item4);
      }
    }
    return true;
  }

  if (foldDetourPhase == 3) {
    if (pdSmooth == 1) {
      tickSmoothServoMotion(item4);
      if (!smoothMotionRunning()) {
        int live = readServoAngleLive();
        if (live >= 0 && abs(live - item4) <= 3) {
          foldDetourPhase = 0;
          foldHoldActive = 1;
        }
      }
    } else {
      f1FoldDetourWriteNow(item4);
      int live = readServoAngleLive();
      if (live >= 0 && abs(live - item4) <= 3) {
        foldDetourPhase = 0;
        foldHoldActive = 1;
        servoFinalizePosition(item4);
      }
    }
    return true;
  }

  return false;
}

// 翻板非阻塞：平滑 tick 插值；折叠微调/关平滑走 tickFlapServoHold
void updateServoOutput() {
  if (item != 0 && item != 1) return;
  if (isSelfCheckFaultLatched()) return;
  if (reboundWaitUntil > 0 && !forceServoMove && !smoothMotionRunning()) return;
  if (item == 0 && f1FoldShouldDetour() && foldDetourPhase == 0) {
    f1BeginFoldDetourMotion();
  }
  if (item == 0 && foldDetourPhase != 0) {
    f1UpdateFoldDetour();
    return;
  }
  int target = (item == 1) ? bianlaing : item4;

  if (pdSmooth == 1) {
    tickSmoothServoMotion(target);
    return;
  }

  if (foldAdjustActive && item == 0) {
    tickFlapServoHold(target);
    return;
  }

  tickFlapServoHold(target);
}

// 串口仅输出转动过程中的 A0 采样值（一行一个数）
void debugPrintMotionA0(int a0) {
#if F2_MOTION_A0_DEBUG
  if (!btnDetectWindowActive()) return;
  if (item != 0 && item != 1) return;
  Serial.println(a0);
#endif
}

/* =============================================================================
 * BLOCK: Flap control — 翻开 / 折回
 * ============================================================================= */
void requestFlapOpen(bool stallRetry) {
  if (item == 1) return;
  if (!stallRetry && !canUserFlapControl()) return;
  if (item == 3 || autoLevelBusy) return;

  abortOpenMotion();
  reboundWaitUntil = 0;
  reboundRetryClose = 0;

  foldAdjustActive = 0;
  f1FoldDetourArmOnOpen();
  int cur = readServoAngleLive();
  if (cur < 0 || cur > 180) {
    cur = lastWrittenAngle;
    if (cur < 0 || cur > 180) cur = item4;
  }
  item = 1;
  pin2SeenHighSinceBoot = 1;
  statusLedUpdate();
  invalidateServoHold();
  foldHoldActive = 0;
  lastWrittenAngle = cur;
  forceServoMove = 1;
  if (pdSmooth == 1) {
    smoothMotionBegin(bianlaing);
    if (smoothPhase == 0) {
      forceServoMove = 1;
    }
  }
  if (motionCheckActive()) {
    beginOpenAttempt(stallRetry);
    restartBtnDetectWindow();
  }
  lastStatusSend = 0;
}

void requestFlapClose(bool userRequest) {
  if (userRequest && !canUserFlapControl()) return;
  if (userRequest && item == 0 && !openEaseActive && servoMoveCommitted(item4)) return;

  // 折回已在进行：忽略重复指令（小程序连发会重启平滑，末段速度变快）
  if (userRequest && item == 0 && !servoMoveCommitted(item4)) {
    if (pdSmooth == 1 && (smoothMotionRunning() || openEaseActive)
        && smoothMotionItem == 0 && smoothTarget == item4) {
      return;
    }
    if (pdSmooth == 0 && servoTrackItem == 0 && servoTrackAngle == item4) {
      return;
    }
  }

  if (!userRequest) {
    clearOpenMonitor();
    armKeyOffRetractSuppress();
    if (item == 0 && !openEaseActive && servoMoveCommitted(item4) && flapPhysicallyAtFold()) {
      return;
    }
  } else if (motionCheckActive()) {
    restartBtnDetectWindow();
  }
  foldToRetract();
}

void eePutBlink(int addr, int val) {
  EEPROM.put(addr, val);
  blinkPin8(3, 100, 100);
}

void resetOpenGuard() {
  openStartMs = millis();
  reboundStuckCount = 0;
  lastStallSampleMs = 0;
  lastMotorSampleMs = 0;
  lastMotorRunSampleMs = 0;
  motorRunSamples = 0;
  motorRunHits = 0;
  isRunning = 0;
  stuckCount = 0;
  singleExec = 0;
  lastMotorA0 = -1;
}

void beginOpenAttempt(bool preserveStallCount) {
  reboundWaitUntil = 0;
  reboundRetryClose = 0;
  if (!preserveStallCount) {
    reboundFaultLatched = 0;
    EEPROM.put(24, (uint8_t)0);
    reboundAttempt = 0;
  }
  resetOpenGuard();
#if F2_SERIAL_DEBUG
  Serial.println(preserveStallCount ? F("OPEN stall retry") : F("OPEN attempt start"));
#endif
}

void faultAlarmLoop(uint8_t triple);

void foldToRetract() {
  if (item == 3) return;
  if (foldDetourPhase != 0) {
    lastStatusSend = 0;
    return;
  }
  abortOpenMotion();
  reboundWaitUntil = 0;
  reboundAttempt = 0;
  reboundStuckCount = 0;
  lastStallSampleMs = 0;
  openStartMs = millis();
  stuckCount = 0;
  stealthActive = 0;
  foldAdjustActive = 0;
  int cur = readServoAngleLive();
  if (cur < 0 || cur > 180) {
    cur = smoothPosNow();
    if (cur < 0 || cur > 180) {
      cur = lastWrittenAngle;
      if (cur < 0 || cur > 180) {
        cur = bianlaing;
        if (cur < 0 || cur > 180) cur = item4;
      }
    }
  }
  item = 0;
  statusLedUpdate();
  forceServoMove = 1;
  foldHoldActive = 0;
  invalidateServoHold();
  lastWrittenAngle = cur;
  if (f1FoldShouldDetour()) {
    f1BeginFoldDetourMotion();
    f1UpdateFoldDetour();
  } else if (pdSmooth == 1) {
    smoothMotionBegin(item4);
  } else {
    writeServoDirect(item4);
  }
  lastStatusSend = 0;
}

void retryFlapCloseMotion() {
  if (item == 3) return;
  foldAdjustActive = 0;
  int cur = readServoAngleLive();
  if (cur < 0 || cur > 180) {
    cur = lastWrittenAngle;
    if (cur < 0 || cur > 180) {
      cur = bianlaing;
      if (cur < 0 || cur > 180) cur = item4;
    }
  }
  item = 0;
  statusLedUpdate();
  forceServoMove = 1;
  foldHoldActive = 0;
  invalidateServoHold();
  lastWrittenAngle = cur;
  openStartMs = millis();
  stuckCount = 0;
  if (pdSmooth == 1) {
    smoothMotionBegin(item4);
  }
  if (motionCheckActive()) restartBtnDetectWindow();
  lastStatusSend = 0;
}

void retractForStall() {
  if (item == 3) return;
  abortOpenMotion();
  stealthActive = 0;
  item = 0;
  forceServoMove = 1;
  foldHoldActive = 0;
  invalidateServoHold();
  lastStatusSend = 0;
}

void triggerStallRebound() {
  if (reboundFaultLatched) return;

  reboundRetryClose = 0;
  reboundStuckCount = 0;
  stuckCount = 0;
  lastStallSampleMs = 0;
  stealthActive = 0;

  uint8_t stallsHandled = reboundAttempt;

  if (stallsHandled + 1 < STALL_REBOUND_MAX) {
    writeServoFaultFastFold();
    if (stallCheckActive()) blinkPin8(10, 75, 75);
    reboundAttempt = stallsHandled + 1;
    reboundWaitUntil = millis() + REBOUND_RETRY_WAIT_MS;
    lastStatusSend = 0;
    sendStatusPacket();
  } else {
    reboundAttempt = STALL_REBOUND_MAX;
    reboundWaitUntil = 0;
    reboundFaultLatched = 1;
    savePendingFaultReport(2);
    enterFaultLockState();
  }
}

void triggerStallDuringClose() {
  if (reboundFaultLatched) return;

  reboundStuckCount = 0;
  stuckCount = 0;
  lastStallSampleMs = 0;
  stealthActive = 0;

  uint8_t stallsHandled = reboundAttempt;

  if (stallsHandled + 1 < STALL_REBOUND_MAX) {
    writeServoFaultFastFold();
    if (stallCheckActive()) blinkPin8(10, 75, 75);
    reboundAttempt = stallsHandled + 1;
    reboundRetryClose = 1;
    reboundWaitUntil = millis() + REBOUND_RETRY_WAIT_MS;
    lastStatusSend = 0;
    sendStatusPacket();
  } else {
    reboundAttempt = STALL_REBOUND_MAX;
    reboundWaitUntil = 0;
    reboundRetryClose = 0;
    reboundFaultLatched = 1;
    savePendingFaultReport(2);
    enterFaultLockState();
  }
}

void clearOpenMonitor() {
  btnDetectStartMs = 0;
  openStartMs = 0;
  clearBtnDetectSamples();
}

void selfCheckTick() {
  tickMotionA0Realtime(false);
}

void tickReboundStateMachine() {
  if (inBootSettle()) return;
  if (autoLevelBusy) return;
  if (!stallCheckActive()) {
    reboundWaitUntil = 0;
    reboundAttempt = 0;
    reboundStuckCount = 0;
    return;
  }
  if (reboundFaultLatched) {
    return;
  }
  if (reboundWaitUntil > 0) {
    if (millis() >= reboundWaitUntil) {
      reboundWaitUntil = 0;
      reboundStuckCount = 0;
      if (reboundRetryClose) {
        reboundRetryClose = 0;
        retryFlapCloseMotion();
#if F2_SERIAL_DEBUG
        Serial.println(F("RETRY CLOSE"));
#endif
      } else {
        requestFlapOpen(true);
#if F2_SERIAL_DEBUG
        Serial.println(F("RETRY OPEN"));
#endif
      }
    }
    return;
  }
}

// 待上报故障写 EEPROM（断电保留）；运行期锁定仍只用 RAM，上电硬复位后自动解除
void loadPendingFaultReportFromEeprom() {
  uint8_t v = 0;
  EEPROM.get(23, v);
  pendingFaultReport = (v == 1 || v == 2) ? v : 0;
}

void savePendingFaultReport(uint8_t errType) {
  if (errType != 1 && errType != 2) return;
  if (pendingFaultReport == 2) return;
  if (errType == 2 || pendingFaultReport == 0) {
    pendingFaultReport = errType;
    EEPROM.put(23, pendingFaultReport);
  }
}

void clearPendingFaultReport() {
  pendingFaultReport = 0;
  EEPROM.put(23, (uint8_t)0);
}

void loadAutoLevelDoneFromEeprom() {
  uint8_t v = 0;
  EEPROM.get(27, v);
  autoLevelDone = (v == 1) ? 1 : 0;
}

void saveAutoLevelDoneToEeprom() {
  autoLevelDone = 1;
  EEPROM.put(27, (uint8_t)1);
}

void clearAutoLevelDone() {
  autoLevelDone = 0;
  EEPROM.put(27, (uint8_t)0);
}

void clearFaultFlags() {
  faultMotorLatched = 0;
  reboundFaultLatched = 0;
  clearPendingFaultReport();
}

bool isSelfCheckFaultLatched() {
  if (reboundFaultLatched || faultMotorLatched) return true;
  return pendingFaultReport == 1 || pendingFaultReport == 2;
}

// 故障锁定：全速收回（不走平滑），供堵转/电机报错使用
void writeServoFaultFastFold() {
  if (item == 3) return;
  foldDetourArmed = 0;
  f1FoldDetourAbort();
  abortOpenMotion();
  item = 0;
  foldHoldActive = 0;
  forceServoMove = 1;
  invalidateServoHold();
  servoPrepareMove();
#if F2_VARSERVO
  servo.write(item4, 255);
#else
  servo.write(item4);
#endif
  lastWrittenAngle = item4;
  servoTrackItem = 0;
  servoTrackAngle = item4;
  unsigned long settleEnd = millis() + 1400UL;
  while (millis() < settleEnd) {
    delayWithBlePoll(20);
    pollBleSerial();
    watchdogFeed();
    updatePin9Power();
  }
  servoFinalizePosition(item4);
}

// 闪灯结束后再次全速收到底并锁定 PWM
static void faultFinalizeFoldDown() {
  forceServoMove = 1;
  invalidateServoHold();
  servoPrepareMove();
#if F2_VARSERVO
  servo.write(item4, 255);
#else
  servo.write(item4);
#endif
  lastWrittenAngle = item4;
  servoTrackItem = 0;
  servoTrackAngle = item4;
  foldHoldActive = 1;
  forceServoMove = 0;
  unsigned long settleEnd = millis() + 600UL;
  while (millis() < settleEnd) {
    delayWithBlePoll(20);
    pollBleSerial();
    watchdogFeed();
    updatePin9Power();
  }
  servoFinalizePosition(item4);
  foldHoldActive = 1;
}

// 电机不转 / 堵转报错：默认快速收回；翻开已到位且仅电机无信号时可保持当前角
void enterFaultLockState(bool holdCurrentAngle) {
  reboundWaitUntil = 0;
  stealthActive = 0;
  pendingKeyOffFold = 0;
  pin9HoldUntil = 0;
  pin9HoldExpired = 0;
  if (digitalRead(2) == LOW) {
    digitalWrite(9, LOW);
  }
  clearOpenMonitor();

  if (holdCurrentAngle) {
    abortOpenMotion();
    int holdAng = readServoAngle();
    if (holdAng < 0 || holdAng > 180) holdAng = bianlaing;
    item = 1;
    foldHoldActive = 0;
    forceServoMove = 0;
    lastWrittenAngle = holdAng;
    servoTrackItem = 1;
    servoTrackAngle = holdAng;
    servoFinalizePosition(holdAng);
  } else {
    bool needFastFold = (item == 1 || openEaseActive || !servoAtAngle(item4));
    if (needFastFold) {
      writeServoFaultFastFold();
    } else if (item == 0) {
      servoFinalizePosition(item4);
      foldHoldActive = 1;
    }
    faultFinalizeFoldDown();
  }

  blinkPin8(FAULT_ACK_BLINK_TIMES, (int)FAULT_LED_BLINK_HALF_MS, (int)FAULT_LED_BLINK_HALF_MS);

  lastStatusSend = 0;
  sendStatusPacket();
#if F2_SERIAL_DEBUG
  Serial.print(F("FAULT LOCK m="));
  Serial.print(faultMotorLatched);
  Serial.print(F(" s="));
  Serial.println(reboundFaultLatched);
#endif
}

#if F2_BLE_STATUS
uint8_t getFaultErr() {
  if (reboundFaultLatched || pendingFaultReport == 2) return 2;
  if (faultMotorLatched || pendingFaultReport == 1) return 1;
  return 0;
}

uint8_t getFaultWrn() {
  if (reboundWaitUntil > 0) return 1;
  return 0;
}

static void printStatusLine(Stream &out, int ang, int accPin, int btnPin, uint8_t err, uint8_t wrn,
                            bool extraPin9) {
  out.print(F("ANG:"));
  out.print(ang);
  out.print(F("|ACC:"));
  out.print(accPin);
  out.print(F("|BTN:"));
  out.print(btnPin);
  out.print(F("|ITM:"));
  out.print(statusItemForBle());
  out.print(F("|SMO:"));
  out.print(pdSmooth);
  out.print(F("|CHK:"));
  out.print(selfCheckOn);
  out.print(F("|STD:"));
  out.print(stallCheckActive() ? 1 : 0);
  out.print(F("|MWR:"));
  out.print(motorWorkCheckActive() ? 1 : 0);
  out.print(F("|RET:"));
  out.print(accRetractOn);
  out.print(F("|PWR:"));
  out.print(powerOnFlip);
  out.print(F("|DPO:"));
  out.print(delayPowerOffMin);
  out.print(F("|ERR:"));
  out.print(err);
  out.print(F("|WRN:"));
  out.print(wrn);
  out.print(F("|TRV:"));
  out.print(travelModeOn);
  out.print(F("|THM:"));
  out.print(travelHoldMin);
  out.print(F("|TAH:"));
  out.print(travelAutoOffHours);
  out.print(F("|TRM:"));
  if (travelModeOn && travelElapsedMin < travelAutoOffLimitMin()) {
    out.print((uint16_t)(travelAutoOffLimitMin() - travelElapsedMin));
  } else {
    out.print(0);
  }
  out.print(F("|STM:"));
  if (item == 3 && stealthElapsedMin < STEALTH_AUTO_OFF_MIN) {
    out.print((uint16_t)(STEALTH_AUTO_OFF_MIN - stealthElapsedMin));
  } else {
    out.print(0);
  }
  out.print(F("|STB:"));
  out.print(stealthBtnExitOn ? 1 : 0);
  out.print(F("|TSD:"));
  out.print(travelSavedDelayMin);
  out.print(F("|TKF:"));
  out.print(travelKeyOffRetractOn ? 1 : 0);
  out.print(F("|SPD:"));
  out.print(userServoSpeed);
  if (statusItemForBle() == 2 && (item == 0 || item == 1)) {
    out.print(F("|MOT:"));
    out.print(item);
  }
  if (extraPin9) {
    unsigned long now = millis();
    unsigned long left = 0;
    if (pin9HoldUntil != 0 && now < pin9HoldUntil) left = pin9HoldUntil - now;
    out.print(F("|P9H:"));
    out.print(left);
    out.print(F("|P9E:"));
    out.print(pin9HoldExpired);
  }
  out.println();
}

void sendStatusPacket() {
  uint8_t err = getFaultErr();
  uint8_t wrn = getFaultWrn();
  bool motion = flapMotionMoving() || openEaseActive;
  unsigned long now = millis();
  // 心跳：至少每 400ms 发一包，避免串口 RX 噪声导致长期静默、小程序误判掉线
  bool heartbeat = (now - lastStatusSend >= 400UL);
  if (!motion && err == 0 && wrn == 0 && !heartbeat) {
    if (rxLen > 0) return;
    if (now - lastReceiveTime < timeout + 20UL) return;
  }
  int accPin = digitalRead(2);
  int btnPin = digitalRead(5);
  static int lastAccPin = -1;
  static int lastBtnPin = -1;
  static int lastItmSent = -1;
  uint8_t ioChanged = (accPin != lastAccPin || btnPin != lastBtnPin) ? 1 : 0;
  int itmNow = statusItemForBle();
  uint8_t itmChanged = (itmNow != lastItmSent) ? 1 : 0;
  unsigned long minGap = motion ? 350UL : 400UL;
  if (!ioChanged && !itmChanged && !heartbeat && err == 0 && wrn == 0 &&
      now - lastStatusSend < minGap) return;
  lastStatusSend = now;
  if (ioChanged) {
    lastAccPin = accPin;
    lastBtnPin = btnPin;
  }
  lastItmSent = itmNow;
  int ang = (item == 1) ? bianlaing : item4;
  printStatusLine(mySerial, ang, accPin, btnPin, err, wrn, false);
}
#else
void sendStatusPacket() {}
#endif

void resetSelfCheckMonitor() {
  clearBtnDetectSamples();
}

void faultAlarmLoop(uint8_t triple) {
  (void)triple;
}

// 故障报警：堵转/电机不转确认后慢闪；10 秒检测窗内不闪灯
void tickFaultAlarm() {
  if (!faultIndicatorActive()) return;
  unsigned long halfMs = FAULT_LED_BLINK_HALF_MS;
  if (faultMotorLatched || reboundFaultLatched) {
    halfMs = MOTION_DETECT_LED_HALF_MS;
  }
  digitalWrite(8, (millis() / halfMs) % 2UL ? LOW : HIGH);
}

/* =============================================================================
 * BLOCK: Pin5 按键 — 单击翻板；按住满 2s 立即进隐蔽；隐蔽内按住 8s 退出
 * ============================================================================= */
#define BTN5_PIN 5
const unsigned long BTN5_ENTER_MS = 2000UL;
const unsigned long BTN5_EXIT_MS = 8000UL;
const unsigned long BTN5_CLICK_MS = 800UL;
const unsigned long BTN5_RELEASE_DEBOUNCE_MS = 25UL;

static unsigned long btn5DownSince = 0;
static unsigned long btn5UpSince = 0;
static unsigned long btn5ExitSince = 0;
static uint8_t btn5EnterDone = 0;
static uint8_t btn5SuppressExit = 0;
// 开机定位/闪灯窗口内屏蔽 Pin5 常规逻辑，避免取消下翻后松手误触发展开
static uint8_t bootPin5Gate = 0;
static uint8_t bootSuppressBtn5Click = 0;

static bool btn5PinDown() {
  return digitalRead(BTN5_PIN) == LOW;
}

static void btn5ToggleFlap() {
  if (item == 3 || autoLevelBusy) return;
  if (!canUserFlapControl()) return;
  lastStatusSend = 0;
  if (motionCheckActive()) {
    restartBtnDetectWindow();
  }
  if (item == 0) {
    requestFlapOpen();
  } else {
    requestFlapClose(true);
  }
}

static void btn5DoEnterStealth(unsigned long heldMs) {
  if (btn5EnterDone || autoLevelBusy || item == 3) return;
  if (!canEnterStealthViaBtn5()) return;
  btn5EnterDone = 1;
  btn5SuppressExit = 1;
  btn5ExitSince = 0;
#if F2_SERIAL_DEBUG
  Serial.print(F("BTN stealth enter ms="));
  Serial.println(heldMs);
#endif
  digitalWrite(8, HIGH);
  enterStealthMode();
}

void btn5Init() {
  btn5DownSince = 0;
  btn5UpSince = 0;
  btn5ExitSince = 0;
  btn5EnterDone = 0;
  btn5SuppressExit = 0;
}

void btn5NoteStealthExited() {
  btn5DownSince = 0;
  btn5UpSince = 0;
  btn5ExitSince = 0;
  btn5EnterDone = 1;
  btn5SuppressExit = 0;
}

void btn5ServiceTick() {
  unsigned long now = millis();
  bool down = btn5PinDown();

  if (bootPin5Gate) return;

  // 任意故障锁定：按键完全无效（含隐蔽模式长按退出）
  if (isSelfCheckFaultLatched()) {
    btn5DownSince = 0;
    btn5UpSince = 0;
    btn5ExitSince = 0;
    btn5EnterDone = 0;
    return;
  }

  if (item == 3) {
    if (down) {
      if (stealthBtnExitOn && !btn5SuppressExit) {
        if (btn5ExitSince == 0) btn5ExitSince = now;
        else if (now - btn5ExitSince >= BTN5_EXIT_MS) {
          btn5ExitSince = 0;
          exitStealthMode();
        }
      }
    } else {
      btn5ExitSince = 0;
      if (btn5SuppressExit) btn5SuppressExit = 0;
    }
    return;
  }

  // 10 秒后的延时断电阶段：按键无反应（前 10 秒仍可长按进隐蔽）
  if (isDelayPowerOffPhase()) {
    btn5DownSince = 0;
    btn5UpSince = 0;
    btn5ExitSince = 0;
    return;
  }

  if (down) {
    btn5UpSince = 0;
    if (btn5DownSince == 0) {
      btn5DownSince = now;
      btn5EnterDone = 0;
      lastStatusSend = 0;
    } else if (!btn5EnterDone && (now - btn5DownSince) >= BTN5_ENTER_MS) {
      btn5DoEnterStealth(now - btn5DownSince);
    }
    return;
  }

  if (btn5DownSince == 0) {
    btn5UpSince = 0;
    return;
  }

  if (btn5UpSince == 0) btn5UpSince = now;
  if (now - btn5UpSince < BTN5_RELEASE_DEBOUNCE_MS) return;

  if (bootSuppressBtn5Click) {
    bootSuppressBtn5Click = 0;
    btn5DownSince = 0;
    btn5UpSince = 0;
    btn5EnterDone = 0;
    return;
  }

  unsigned long held = now - btn5DownSince;
  if (!btn5EnterDone && held >= BTN5_ENTER_MS) {
    btn5DoEnterStealth(held);
  } else if (!btn5EnterDone) {
    btn5ToggleFlap();
  }

  btn5DownSince = 0;
  btn5UpSince = 0;
  btn5EnterDone = 0;
}

void faultCheckLoop() {}

void loadJudgeValFromEeprom() {
  EEPROM.get(13, judgeVal);
  if (judgeVal < STALL_JUDGE_MIN || judgeVal > STALL_JUDGE_MAX || judgeVal != STALL_CURRENT_DEFAULT) {
    judgeVal = STALL_CURRENT_DEFAULT;
    EEPROM.put(13, judgeVal);
  }
}

void saveJudgeValToEeprom() {
  if (judgeVal < STALL_JUDGE_MIN) judgeVal = STALL_JUDGE_MIN;
  if (judgeVal > STALL_JUDGE_MAX) judgeVal = STALL_JUDGE_MAX;
  EEPROM.put(13, judgeVal);
}

// 自动调平日志（F1_COMPACT_FLASH 时省略以省 flash）
#if F1_COMPACT_FLASH
void autoLevelLogLine(const __FlashStringHelper *) {}
void autoLevelLogScan(int, int, int) {}
void autoLevelLogHit(int, int) {}
void autoLevelLogKV(const __FlashStringHelper *, int) {}
#else
void autoLevelLogLine(const __FlashStringHelper *tag) {
  mySerial.println(tag);
#if F2_SERIAL_DEBUG
  Serial.println(tag);
#endif
}

void autoLevelLogScan(int ang, int a0, int thr) {
  mySerial.print(F("ALOG ang="));
  mySerial.print(ang);
  mySerial.print(F(" A0="));
  mySerial.print(a0);
  mySerial.print(F(" thr="));
  mySerial.println(thr);
#if F2_SERIAL_DEBUG
  Serial.print(F("ALOG ang="));
  Serial.print(ang);
  Serial.print(F(" A0="));
  Serial.print(a0);
  Serial.print(F(" thr="));
  Serial.println(thr);
#endif
}

void autoLevelLogHit(int ang, int a0) {
  mySerial.print(F("ALOG HIT ang="));
  mySerial.print(ang);
  mySerial.print(F(" A0="));
  mySerial.println(a0);
#if F2_SERIAL_DEBUG
  Serial.print(F("ALOG HIT ang="));
  Serial.print(ang);
  Serial.print(F(" A0="));
  Serial.println(a0);
#endif
}

void autoLevelLogKV(const __FlashStringHelper *key, int val) {
  mySerial.print(key);
  mySerial.println(val);
#if F2_SERIAL_DEBUG
  Serial.print(key);
  Serial.println(val);
#endif
}
#endif

// 钥匙/开机调试：仅 USB 硬件串口输出 KDBG|...（9600），勿走蓝牙
#if F2_KEY_SERIAL_DEBUG
static void keyDbgLine(const __FlashStringHelper *tag) {
  Serial.print(F("KDBG|"));
  Serial.println(tag);
}

static void keyDbgKv(const __FlashStringHelper *tag, int a, int b) {
  Serial.print(F("KDBG|"));
  Serial.print(tag);
  Serial.print(F("|"));
  Serial.print(a);
  if (b != -9999) {
    Serial.print(F("|"));
    Serial.print(b);
  }
  Serial.println();
}
#endif

int autoScanStall(int from, int to, int thr) {
#if !F1_COMPACT_FLASH
  mySerial.print(F("ALOG SCAN "));
  mySerial.print(from);
  mySerial.print(F("->"));
  mySerial.print(to);
  mySerial.print(F(" thr="));
  mySerial.println(thr);
#if F2_SERIAL_DEBUG
  Serial.print(F("ALOG SCAN "));
  Serial.print(from);
  Serial.print(F("->"));
  Serial.print(to);
  Serial.print(F(" thr="));
  Serial.println(thr);
#endif
#endif
  int d = (to >= from) ? 1 : -1;
  for (int a = from; a != to + d; a += d) {
    servo.write(a);
    lastWrittenAngle = a;
    delayWithBlePoll(500);
    int a0 = analogRead(A0);
    AUTO_LEVEL_LOG_SCAN(a, a0, thr);
    if (a0 < thr) {
      AUTO_LEVEL_LOG_HIT(a, a0);
      return a;
    }
  }
  AUTO_LEVEL_LOG_KV(F("ALOG SCAN end ang="), to);
  return to;
}

void runAutoLevel() {
  if (autoLevelBusy) {
    AUTO_LEVEL_LOG_LINE(F("ALOG skip dup AUTO LEVEL"));
    blinkPin8(1, 80, 80);
    return;
  }
  clearAutoLevelDone();

  if (item == 3) {
    stealthActive = 0;
    stealthElapsedMin = 0;
    stealthMinuteMark = 0;
    item = 0;
    foldHoldActive = 1;
    btn5NoteStealthExited();
    updatePin9Power();
    statusLedUpdate();
  }

  autoLevelBusy = 1;
  blinkPin8(2, 80, 80);
  AUTO_LEVEL_LOG_LINE(F("ALOG ===== AUTO LEVEL START ====="));
  servoPrepareMove();
  servo.write(120);
  lastWrittenAngle = 120;
  delayWithBlePoll(1500);

  AUTO_LEVEL_LOG_LINE(F("ALOG -- find fold --"));
  y = autoScanStall(120, 180, AUTO_LEVEL_FOLD_THR);
  AUTO_LEVEL_LOG_KV(F("ALOG fold pass1 y="), y);
  y = y - 10;
  int u = autoScanStall(y, 180, AUTO_LEVEL_FOLD_THR);
  AUTO_LEVEL_LOG_KV(F("ALOG fold pass2 u="), u);
  if (u == 180) {
    item4 = 180;
    delayWithBlePoll(300);
  } else {
    item4 = u - 3;
  }
  AUTO_LEVEL_LOG_KV(F("ALOG item4="), item4);
  EEPROM.put(3, item4);

  AUTO_LEVEL_LOG_LINE(F("ALOG -- find open --"));
  servo.write(90);
  lastWrittenAngle = 90;
  y = autoScanStall(90, 0, AUTO_LEVEL_OPEN_THR);
  AUTO_LEVEL_LOG_KV(F("ALOG open pass1 y="), y);
  y = y + 10;
  int m = autoScanStall(y, 0, AUTO_LEVEL_OPEN_THR);
  AUTO_LEVEL_LOG_KV(F("ALOG open pass2 m="), m);
  if (m == 0) {
    delayWithBlePoll(300);
    bianlaing = 0;
    servo.write(0);
  } else {
    bianlaing = m;
    servo.write(bianlaing);
    delayWithBlePoll(300);
  }
  lastWrittenAngle = bianlaing;
  AUTO_LEVEL_LOG_KV(F("ALOG bianlaing="), bianlaing);
  EEPROM.put(1, bianlaing);

  AUTO_LEVEL_LOG_LINE(F("ALOG -- finish to fold --"));
  invalidateServoHold();
  item = 0;
  writeServo(item4);
  waitServoReach(item4);
  blinkPin8(3, 100, 100);
  AUTO_LEVEL_LOG_LINE(F("ALOG ===== AUTO LEVEL DONE ====="));
  saveAutoLevelDoneToEeprom();
  autoLevelBusy = 0;
  drainBleRx();
}

static void moveServoToFoldAngle(int angle) {
  if (angle < 0) angle = 0;
  if (angle > 180) angle = 180;
  if (item == 3) return;
  item = 0;
  statusLedUpdate();
  forceServoMove = 1;
  foldHoldActive = 0;
  invalidateServoHold();
  int cur = readServoAngleLive();
  if (cur < 0 || cur > 180) {
    cur = lastWrittenAngle;
    if (cur < 0 || cur > 180) cur = bianlaing;
  }
  lastWrittenAngle = cur;
  if (pdSmooth == 1) {
    smoothMotionBegin(angle);
  } else {
    writeServoDirect(angle);
  }
}

static void applyFoldAdjustStep(int delta) {
  int next = item4 + delta;
  if (next < 0 || next > 180) return;
  item4 = next;
  EEPROM.put(3, item4);
  moveServoToFoldAngle(item4);
  lastStatusSend = 0;
  sendStatusPacket();
}

void handleBleCommand(char *cmd) {
  trimBuf(cmd);
  if (cmd[0] == 0) return;
#if F2_SERIAL_DEBUG
  Serial.print(F("[CMD] "));
  Serial.println(cmd);
#endif

  if (cmdIsP(cmd, CMD_FAULT_ACK)) {
    clearFaultFlags();
    lastStatusSend = 0;
    sendStatusPacket();
    return;
  }

  // 自动调平：允许重复执行；不受故障锁定/隐蔽模式拦截（与「点按无反应」修复相关）
  if (cmdIsP(cmd, CMD_AUTO_LEVEL)) {
    runAutoLevel();
    return;
  }

  if (isSelfCheckFaultLatched()) return;

  if (cmdIsP(cmd, CMD_STEALTH_ON)) {
    if (item != 3) enterStealthMode();
    return;
  }
  if (cmdIsP(cmd, CMD_STEALTH_OFF)) {
    if (item == 3) exitStealthMode();
    return;
  }
  if (cmdIsP(cmd, CMD_STEALTH_BTN_ON)) {
    stealthBtnExitOn = 1;
    EEPROM.put(28, stealthBtnExitOn);
    blinkPin8(2, 80, 80);
    lastStatusSend = 0;
    sendStatusPacket();
    return;
  }
  if (cmdIsP(cmd, CMD_STEALTH_BTN_OFF)) {
    stealthBtnExitOn = 0;
    EEPROM.put(28, stealthBtnExitOn);
    blinkPin8(2, 80, 80);
    lastStatusSend = 0;
    sendStatusPacket();
    return;
  }
  if (cmdIsP(cmd, CMD_TRAVEL_ON)) {
    enableTravelMode();
    return;
  }
  if (cmdIsP(cmd, CMD_TRAVEL_OFF)) {
    disableTravelMode();
    return;
  }
  if (cmdIsP(cmd, CMD_TRAVEL_KEY_HOLD)) {
    travelKeyOffRetractOn = 0;
    EEPROM.put(33, (uint8_t)0);
    blinkPin8(3, 100, 100);
    lastStatusSend = 0;
    sendStatusPacket();
    return;
  }
  if (cmdIsP(cmd, CMD_TRAVEL_KEY_FOLD)) {
    travelKeyOffRetractOn = 1;
    EEPROM.put(33, (uint8_t)1);
    blinkPin8(3, 100, 100);
    lastStatusSend = 0;
    sendStatusPacket();
    return;
  }

  {
    int holdMin = parseCmdSuffixInt(cmd, CMD_TRAVEL_HOLD);
    if (holdMin >= 0) {
      if (holdMin < TRAVEL_HOLD_MIN_MIN) holdMin = TRAVEL_HOLD_MIN_MIN;
      if (holdMin > TRAVEL_HOLD_MIN_MAX) holdMin = TRAVEL_HOLD_MIN_MAX;
      saveTravelHoldMin((uint8_t)holdMin);
      blinkPin8(2, 80, 80);
      lastStatusSend = 0;
      sendStatusPacket();
      return;
    }
  }

  {
    int hours = parseCmdSuffixInt(cmd, CMD_TRAVEL_TIME);
    if (hours >= 0) {
      if (hours < TRAVEL_AUTO_OFF_H_MIN) hours = TRAVEL_AUTO_OFF_H_MIN;
      if (hours > TRAVEL_AUTO_OFF_H_MAX) hours = TRAVEL_AUTO_OFF_H_MAX;
      saveTravelAutoOffHours((uint8_t)hours);
      blinkPin8(2, 80, 80);
      lastStatusSend = 0;
      sendStatusPacket();
      return;
    }
  }

  {
    int dpoMin = parseCmdSuffixInt(cmd, CMD_DELAY_PWR);
    if (dpoMin >= 0) {
      if (travelModeOn) return;
      if (dpoMin > DELAY_PWR_MIN_MAX) dpoMin = DELAY_PWR_MIN_MAX;
      delayPowerOffMin = dpoMin;
      EEPROM.put(15, delayPowerOffMin);
      blinkPin8(3, 100, 100);
      return;
    }
  }

  {
    int spdPct = parseCmdSuffixInt(cmd, CMD_SPEED);
    if (spdPct >= 0) {
      if (spdPct < SERVO_SPEED_MIN_PCT) spdPct = SERVO_SPEED_MIN_PCT;
      if (spdPct > SERVO_SPEED_MAX_PCT) spdPct = SERVO_SPEED_MAX_PCT;
      userServoSpeed = (uint8_t)spdPct;
      EEPROM.put(25, userServoSpeed);
      blinkPin8(2, 80, 80);
      lastStatusSend = 0;
      sendStatusPacket();
      return;
    }
  }

  if (item == 3) return;

  if (autoLevelBusy) {
    if (cmdIsP(cmd, CMD_OPEN) || cmdIsP(cmd, CMD_CLOSE)) return;
  }

  if (cmdIsP(cmd, CMD_OPEN)) {
    if (canUserFlapControl() && item != 1) {
      requestFlapOpen();
    }
    return;
  }
  if (cmdIsP(cmd, CMD_CLOSE)) {
    if (canUserFlapControl()) {
      requestFlapClose();
    }
    return;
  }
  if (cmdIsP(cmd, CMD_SMOOTH_ON)) {
    pdSmooth = 1;
    invalidateServoHold();
    eePutBlink(11, pdSmooth);
    return;
  }
  if (cmdIsP(cmd, CMD_SMOOTH_OFF)) {
    pdSmooth = 0;
    invalidateServoHold();
    eePutBlink(11, pdSmooth);
    return;
  }
  if (cmdIsP(cmd, CMD_ACC_ON)) {
    accRetractOn = 1;
    eePutBlink(5, accRetractOn);
  } else if (cmdIsP(cmd, CMD_ACC_OFF)) {
    accRetractOn = 0;
    eePutBlink(5, accRetractOn);
  } else if (cmdIsP(cmd, CMD_CHECK_ON)) {
    selfCheckOn = 1;
    clearFaultFlags();
    eePutBlink(7, selfCheckOn);
  } else if (cmdIsP(cmd, CMD_PWR_UP)) {
    blinkPin8(3, 100, 100);
    powerOnFlip = 0;
    EEPROM.put(9, 0);
  } else if (cmdIsP(cmd, CMD_PWR_DN)) {
    blinkPin8(3, 100, 100);
    powerOnFlip = 1;
    EEPROM.put(9, 1);
  } else if (cmdIsP(cmd, CMD_CHECK_OFF)) {
    selfCheckOn = 0;
    clearFaultFlags();
    singleExec = 0;
    stuckCount = 0;
    isRunning = 0;
    clearOpenMonitor();
    eePutBlink(7, selfCheckOn);
  } else if (cmdIsP(cmd, CMD_STALL_CHK_ON)) {
    stallDetectOn = 1;
    EEPROM.put(29, stallDetectOn);
    blinkPin8(2, 80, 80);
    lastStatusSend = 0;
    sendStatusPacket();
    return;
  } else if (cmdIsP(cmd, CMD_STALL_CHK_OFF)) {
    stallDetectOn = 0;
    EEPROM.put(29, stallDetectOn);
    blinkPin8(2, 80, 80);
    lastStatusSend = 0;
    sendStatusPacket();
    return;
  } else if (cmdIsP(cmd, CMD_MOTOR_CHK_ON)) {
    motorWorkCheckOn = 1;
    EEPROM.put(30, motorWorkCheckOn);
    blinkPin8(2, 80, 80);
    lastStatusSend = 0;
    sendStatusPacket();
    return;
  } else if (cmdIsP(cmd, CMD_MOTOR_CHK_OFF)) {
    motorWorkCheckOn = 0;
    EEPROM.put(30, motorWorkCheckOn);
    blinkPin8(2, 80, 80);
    lastStatusSend = 0;
    sendStatusPacket();
    return;
  } else if (cmdIsP(cmd, CMD_UP)) {
    if (item != 3) {
      item = 1;
      foldHoldActive = 0;
      statusLedUpdate();
    }
    if (servo.read() > 180) bianlaing = 180;
    else {
      bianlaing += 2;
      invalidateServoHold();
      writeServo(bianlaing);
    }
    EEPROM.put(1, bianlaing);
    lastStatusSend = 0;
  } else if (cmdIsP(cmd, CMD_DOWN)) {
    if (item != 3) {
      item = 1;
      foldHoldActive = 0;
      statusLedUpdate();
    }
    if (servo.read() < 0) bianlaing = 0;
    else {
      bianlaing -= 2;
      invalidateServoHold();
      writeServo(bianlaing);
    }
    EEPROM.put(1, bianlaing);
    lastStatusSend = 0;
  } else if (cmdIsP(cmd, CMD_FULL_OPEN)) {
    if (item != 3) {
      item = 1;
      foldHoldActive = 0;
      statusLedUpdate();
    }
    bianlaing = fullOpenAngle;
    invalidateServoHold();
    writeServo(bianlaing);
    EEPROM.put(1, bianlaing);
    lastStatusSend = 0;
  } else if (cmdIsP(cmd, CMD_CUSTOM)) {
    if (item != 3) {
      item = 1;
      foldHoldActive = 0;
      statusLedUpdate();
    }
    bianlaing = customAngle;
    invalidateServoHold();
    writeServo(bianlaing);
    EEPROM.put(1, bianlaing);
    lastStatusSend = 0;
  } else if (cmdIsP(cmd, CMD_INIT_ANGLE)) {
    clearAutoLevelDone();
    item4 = 150;
    invalidateServoHold();
    writeServoDirect(item4);
    EEPROM.put(3, item4);
    lastStatusSend = 0;
    sendStatusPacket();
  } else if (cmdIsP(cmd, CMD_ADJ_FOLD)) {
    foldAdjustActive = 1;
    if (item != 3) {
      moveServoToFoldAngle(item4);
    }
    statusLedUpdate();
    lastStatusSend = 0;
    sendStatusPacket();
  } else if (cmdIsP(cmd, CMD_ADJ_BIG)) {
    if (!foldAdjustActive) foldAdjustActive = 1;
    applyFoldAdjustStep(-1);
  } else if (cmdIsP(cmd, CMD_ADJ_SMALL)) {
    if (!foldAdjustActive) foldAdjustActive = 1;
    applyFoldAdjustStep(1);
  }
}

// 开机定位：须过最短行程时间且连续采样到位，避免 write 后 read 误报已到位
static void waitBootServoReach(int target) {
  int start = readServoAngleLive();
  if (start < 0 || start > 180) start = lastWrittenAngle;
  if (start < 0 || start > 180) start = target;

  unsigned long span = (unsigned long)abs(target - start);
  // 冷启动无真实角度：指令角已是目标时，仍按开合行程留足到位时间
  if (span <= 3) {
    int other = (item == 1) ? item4 : bianlaing;
    if (other >= 0 && other <= 180) span = (unsigned long)abs(target - other);
    if (span < 40) span = 40;
  }
  unsigned long minMoveMs = span * 28UL + 450UL;
  if (minMoveMs < 450UL) minMoveMs = 450UL;
  if (minMoveMs > 6500UL) minMoveMs = 6500UL;
  unsigned long moveStart = millis();
  unsigned long deadline = moveStart + minMoveMs + 5000UL;
  unsigned long lastCmdMs = 0;
  uint8_t stableHits = 0;
  forceServoMove = 1;

  while ((long)(millis() - deadline) < 0 && !isSelfCheckFaultLatched()) {
    unsigned long now = millis();
    pollBleSerial();
    btn5ServiceTick();
    watchdogFeed();
    tickStealthKeyWindow();
    updatePin9Power();

    bool pastMin = (now - moveStart) >= minMoveMs;
    int live = readServoAngleLive();
    if (pastMin && live >= 0 && abs(live - target) <= 3) {
      if (++stableHits >= 5) {
        lastWrittenAngle = live;
        return;
      }
    } else {
      stableHits = 0;
    }

    if (lastCmdMs == 0 || (now - lastCmdMs) >= 80UL) {
      lastCmdMs = now;
      if (servoPwmOff) {
        servoPrepareMove();
      }
      servo.write(target);
      servoTrackItem = item;
      servoTrackAngle = target;
    }
    delayWithBlePoll(16);
  }
}

// 开机定位：满速转到目标角并等物理到位后再断 PWM（避免未到位就进自检闪灯）
static void bootMoveToTarget(int target, uint8_t itemState) {
  if (target < 0) target = 0;
  if (target > 180) target = 180;
  item = itemState;
  abortOpenMotion();
  reboundWaitUntil = 0;
  reboundAttempt = 0;
  reboundStuckCount = 0;
  singleExec = 0;
  isRunning = 0;
  foldHoldActive = (itemState == 0) ? 1 : 0;
  invalidateServoHold();
  smoothMotionAbort();
  servoCancelPwmHold();
  if (lastWrittenAngle < 0 || lastWrittenAngle > 180) {
    lastWrittenAngle = target;
  }
  servoPrepareMove();
  lastWrittenAngle = target;
  forceServoMove = 1;
  servo.write(target);
  servoTrackItem = item;
  servoTrackAngle = target;
  waitBootServoReach(target);
  forceServoMove = 0;
  if (!isSelfCheckFaultLatched()) {
    servoFinalizePosition(target);
    lastWrittenAngle = target;
    servoTrackItem = item;
    servoTrackAngle = target;
  }
}

static void bootPwrSettleWait() {
  keyDbgLine(F("BOOT_PWR_WAIT"));
  delayWithBlePoll(BOOT_PWR_SETTLE_MS);
}

static void bootBlinkLeadOn() {
  digitalWrite(8, HIGH);
  keyDbgLine(F("BOOT_LED_BLINK"));
  delayWithBlePoll(BOOT_LED_LEAD_ON_MS);
}

static void bootBlinkLeadOff() {
  digitalWrite(8, LOW);
  delayWithBlePoll(500);
}

#define BOOT_BLINK_CANCEL_MS 80UL

// 开机下翻：5 次稍快闪烁；闪灯期间按 Pin5 取消下翻（直达 item4）
static bool bootFoldBlinkDelayPoll(unsigned long ms, unsigned long &pressSince) {
  unsigned long endAt = millis() + ms;
  unsigned long lastStatusInDelay = 0;
  while ((long)(millis() - endAt) < 0) {
    pollBleSerial();
    unsigned long now = millis();
    if (now - lastStatusInDelay >= 200UL) {
      lastStatusInDelay = now;
      sendStatusPacket();
    }
    tickStealthKeyWindow();
    watchdogFeed();
    updatePin9Power();
    if (btn5PinDown()) {
      if (pressSince == 0) pressSince = now;
      else if (now - pressSince >= BOOT_BLINK_CANCEL_MS) {
        return true;
      }
    } else {
      pressSince = 0;
    }
  }
  return false;
}

static void bootWaitPin5Release() {
  unsigned long deadline = millis() + 8000UL;
  while (btn5PinDown() && (long)(millis() - deadline) < 0) {
    pollBleSerial();
    watchdogFeed();
    updatePin9Power();
    delay(16);
  }
}

// 开机下翻：慢闪 5 次；期间按 Pin5 跳过下翻，直达 item4
static bool bootBlinkFoldBootPrompt() {
  unsigned long pressSince = 0;
  for (uint8_t i = 0; i < 5; i++) {
    digitalWrite(8, HIGH);
    if (bootFoldBlinkDelayPoll((unsigned long)BOOT_FOLD_SLOW_HALF_MS, pressSince)) {
      digitalWrite(8, LOW);
      keyDbgLine(F("BOOT_OPEN_SKIP"));
      return true;
    }
    digitalWrite(8, LOW);
    if (bootFoldBlinkDelayPoll((unsigned long)BOOT_FOLD_SLOW_HALF_MS, pressSince)) {
      digitalWrite(8, LOW);
      keyDbgLine(F("BOOT_OPEN_SKIP"));
      return true;
    }
  }
  digitalWrite(8, LOW);
  return false;
}

// 开机下翻展开：平滑开则用 smoothMotionBegin，与后续折回同一套曲线
static void bootFlapOpenForce() {
  keyDbgKv(F("BOOT_OPEN_START"), bianlaing, item);
  abortOpenMotion();
  reboundWaitUntil = 0;
  reboundRetryClose = 0;
  foldAdjustActive = 0;
  f1FoldDetourArmOnOpen();
  pin2SeenHighSinceBoot = 1;
  // 冷启动物理在折叠位；起点必须是 item4，不能误设成 bianlaing（否则平滑会认为已到位）
  int cur = item4;
  if (cur < 0 || cur > 180) {
    cur = lastWrittenAngle;
    if (cur < 0 || cur > 180) cur = 0;
  }
  lastWrittenAngle = cur;

  if (pdSmooth == 1) {
    item = 1;
    forceServoMove = 1;
    invalidateServoHold();
    foldHoldActive = 0;
    smoothMotionBegin(bianlaing);
    unsigned long deadline = millis() + 15000UL;
    while (smoothMotionRunning() && !isSelfCheckFaultLatched() &&
           (long)(millis() - deadline) < 0) {
      tickSmoothServoMotion(bianlaing);
      pollBleSerial();
      watchdogFeed();
      tickStealthKeyWindow();
      updatePin9Power();
      delayWithBlePoll(16);
    }
    forceServoMove = 0;
    if (!isSelfCheckFaultLatched()) {
      servoFinalizePosition(bianlaing);
      lastWrittenAngle = bianlaing;
      servoTrackItem = 1;
      servoTrackAngle = bianlaing;
    }
  } else {
    bootMoveToTarget(bianlaing, 1);
  }
  keyDbgKv(F("BOOT_OPEN_DONE"), item, lastWrittenAngle);
}

// 与出行模式接钥匙下翻一致：灯亮 + 展开到 bianlaing
static void bootTravelStyleOpenDown() {
  digitalWrite(8, HIGH);
  keyDbgLine(F("BOOT_TRAVEL_STYLE_OPEN"));
  bootFlapOpenForce();
  digitalWrite(8, HIGH);
  statusLedUpdate();
}

// 开机自检：5 次闪灯窗口内按住 Pin5 才执行开合检测；leadBlinkDone=1 表示已在发角前闪过一次
static bool bootSelfCheckPin5Requested(uint8_t leadBlinkDone) {
  if (!pin5BootWasReleased()) {
    return false;
  }
  p = leadBlinkDone ? 1 : 0;
  int first = leadBlinkDone ? 1 : 0;
  for (int i = first; i < 5; i++) {
    digitalWrite(8, HIGH);
    delayWithBlePoll(500);
    digitalWrite(8, LOW);
    delayWithBlePoll(500);
    p++;
    if (pin5DebouncedLow(6)) {
      p = 0;
      return true;
    }
  }
  if (p == 5) blinkPin8(4, 100, 100);
  return false;
}

static void waitBtnDetectWindowComplete() {
  while (btnDetectStartMs != 0 && !isSelfCheckFaultLatched()) {
    tickMotionA0Realtime(true);
    if (item == 0 || item == 1) updateServoOutput();
    delayWithBlePoll(16);
    pollBleSerial();
    btn5ServiceTick();
  }
}

// 主动故障检测开合循环；开机上翻时最后须回到翻开位，不能停在折回
static void runSelfCheckOpenCloseCycle() {
  uint8_t bootShouldOpen = (powerOnFlip == 1) ? 1 : 0;
  keyDbgKv(F("CHK_CYCLE_START"), bootShouldOpen, item);
  restartBtnDetectWindow();

  if (!bootShouldOpen || item != 1) {
    item = 1;
    forceServoMove = 1;
    invalidateServoHold();
    writeServo(bianlaing);
    waitServoReach(bianlaing);
    forceServoMove = 0;
    foldHoldActive = 0;
    servoTrackItem = 1;
    servoTrackAngle = bianlaing;
  }

  item = 0;
  forceServoMove = 1;
  invalidateServoHold();
  writeServo(item4);
  waitServoReach(item4);
  forceServoMove = 0;
  foldHoldActive = 1;
  servoTrackItem = 0;
  servoTrackAngle = item4;

  waitBtnDetectWindowComplete();

  if (bootShouldOpen) {
    item = 1;
    forceServoMove = 1;
    invalidateServoHold();
    writeServo(bianlaing);
    waitServoReach(bianlaing);
    forceServoMove = 0;
    foldHoldActive = 0;
    servoTrackItem = 1;
    servoTrackAngle = bianlaing;
  }

  clearOpenMonitor();
  statusLedUpdate();
  keyDbgKv(F("CHK_CYCLE_END"), item, lastWrittenAngle);
}

// 开机下翻：满速转到折叠位 item4 并等到位（不经 180° 归位）
void bootMoveToFold() {
  stealthActive = 0;
  f1FoldDetourAbort();
  foldDetourArmed = 0;
  bootMoveToTarget(item4, 0);
}

// 开机闪灯取消下翻：走 F1 折叠归位 180° → 停 1s → item4
static void waitBootFoldDetourComplete() {
  unsigned long deadline = millis() + 25000UL;
  while (foldDetourPhase != 0 && !isSelfCheckFaultLatched() &&
         (long)(millis() - deadline) < 0) {
    f1UpdateFoldDetour();
    pollBleSerial();
    watchdogFeed();
    tickStealthKeyWindow();
    updatePin9Power();
    delayWithBlePoll(16);
  }
  forceServoMove = 0;
  if (!isSelfCheckFaultLatched() && foldDetourPhase == 0) {
    servoFinalizePosition(item4);
    lastWrittenAngle = item4;
    servoTrackItem = 0;
    servoTrackAngle = item4;
    foldHoldActive = 1;
    foldDetourArmed = 0;
  }
}

static void bootMoveToFoldWithDetour() {
  stealthActive = 0;
  f1FoldDetourAbort();
  foldDetourArmed = 1;
  foldToRetract();
  waitBootFoldDetourComplete();
}

void setup() {
  MCUSR = 0;
  wdt_disable();

#if F2_MOTION_A0_DEBUG || F2_KEY_SERIAL_DEBUG
  Serial.begin(9600);
#endif
  mySerial.begin(115200);
  item = 0;
  bianlaing = 0;
  fullOpenAngle = 80;
  customAngle = 110;
  item4 = 0;
  accRetractOn = 0;
  lastReceiveTime = 0;
  timeout = 100;
  y = 0;
  selfCheckOn = 0;
  p = 0;
  powerOnFlip = 0;
  isRunning = 0;
  stuckCount = 0;
  singleExec = 0;
  pdSmooth = 0;
  openStartMs = 0;
  reboundWaitUntil = 0;
  reboundAttempt = 0;
  reboundStuckCount = 0;
  faultMotorLatched = 0;
  reboundFaultLatched = 0;
  pendingFaultReport = 0;
  lastStatusSend = 0;
  selfCheckStartMs = 0;
  lastStallSampleMs = 0;
  accReonStart = 0;
  stealthActive = 0;
  stealthWindowStart = 0;
  pin9HoldUntil = 0;
  pin9HoldExpired = 0;
  pendingKeyOffFold = 0;
  pin2SeenHighSinceBoot = 0;
  pin2LowSince = 0;
  pin2HighSince = 0;
  keyOffFoldHandled = 0;
  lastPin2High = 1;
  pin2EdgeInit = 0;
  keyOffRetractIssued = 0;
  keyOffRetractBusy = 0;
  delayPowerOffMin = 0;
  userServoSpeed = SERVO_SPEED_DEFAULT_PCT;
  travelModeOn = 0;
  travelSavedDelayMin = 0;
  travelElapsedMin = 0;
  travelMinuteMark = 0;
  travelHoldMin = TRAVEL_HOLD_MIN_DEFAULT;
  travelAutoOffHours = TRAVEL_AUTO_OFF_H_DEFAULT;
  stealthElapsedMin = 0;
  stealthMinuteMark = 0;
  rxLen = 0;
  foldDetourArmed = 0;
  f1FoldDetourAbort();

  pinMode(8, OUTPUT);
  pinMode(5, INPUT_PULLUP);
  pinMode(9, OUTPUT);
  pinMode(SERVO_MOTION_PIN, OUTPUT);
  servoMotionOff();
  pinMode(2, INPUT);
  pin2SeenHighSinceBoot = (digitalRead(2) == HIGH) ? 1 : 0;
  lastPin2High = pin2SeenHighSinceBoot ? 1 : 0;
  pin2EdgeInit = 1;
  pinMode(A0, INPUT);

  // 通电最先读折叠角与开机模式
  EEPROM.get(3, item4);
  EEPROM.get(9, powerOnFlip);
  if (powerOnFlip != 0 && powerOnFlip != 1) {
    powerOnFlip = 0;
    EEPROM.put(9, 0);
  }
  if (item4 < 0 || item4 > 180) {
    item4 = 150;
    EEPROM.put(3, item4);
  }
  servoPwmOff = 1;
  item = 0;

  EEPROM.get(1, bianlaing);
  EEPROM.get(5, accRetractOn);
  EEPROM.get(7, selfCheckOn);
  EEPROM.get(29, stallDetectOn);
  EEPROM.get(30, motorWorkCheckOn);
  if (stallDetectOn > 1 && motorWorkCheckOn > 1) {
    stallDetectOn = (selfCheckOn == 1) ? 1 : 0;
    motorWorkCheckOn = stallDetectOn;
    EEPROM.put(29, stallDetectOn);
    EEPROM.put(30, motorWorkCheckOn);
  }
  EEPROM.get(11, pdSmooth);
  if (pdSmooth != 0 && pdSmooth != 1) {
    pdSmooth = 0;
    EEPROM.put(11, pdSmooth);
  }
  loadJudgeValFromEeprom();
  EEPROM.get(15, delayPowerOffMin);
  if (delayPowerOffMin < 0 || delayPowerOffMin > DELAY_PWR_MIN_MAX) {
    delayPowerOffMin = 0;
    EEPROM.put(15, delayPowerOffMin);
  }
  loadTravelConfigFromEeprom();
  EEPROM.get(17, travelModeOn);
  EEPROM.get(19, travelSavedDelayMin);
  EEPROM.get(21, travelElapsedMin);
  if (travelModeOn != 0 && travelModeOn != 1) travelModeOn = 0;
  if (travelElapsedMin >= travelAutoOffLimitMin()) {
    disableTravelMode();
  } else if (travelModeOn) {
    delayPowerOffMin = 0;
    travelMinuteMark = millis();
  }
  EEPROM.get(25, userServoSpeed);
  if (userServoSpeed < SERVO_SPEED_MIN_PCT || userServoSpeed > SERVO_SPEED_MAX_PCT) {
    userServoSpeed = SERVO_SPEED_DEFAULT_PCT;
    EEPROM.put(25, userServoSpeed);
  }
  loadPendingFaultReportFromEeprom();
  // 冷启动一律清除历史待上报故障（避免误报残留）；当次上电故障仍走 RAM 锁定
  clearPendingFaultReport();
  faultMotorLatched = 0;
  reboundFaultLatched = 0;
  reboundAttempt = 0;
  reboundWaitUntil = 0;
  reboundRetryClose = 0;
  clearOpenMonitor();
  loadAutoLevelDoneFromEeprom();
  EEPROM.get(28, stealthBtnExitOn);
  if (stealthBtnExitOn != 0 && stealthBtnExitOn != 1) {
    stealthBtnExitOn = 1;
    EEPROM.put(28, stealthBtnExitOn);
  }

  if (bianlaing < 0 || bianlaing > 180) {
    bianlaing = 80;
    EEPROM.put(1, bianlaing);
  }

  keyDbgKv(F("SETUP"), powerOnFlip, accRetractOn);
  keyDbgKv(F("SETUP_ANG"), bianlaing, item4);
  keyDbgKv(F("SETUP_PIN2"), digitalRead(2), selfCheckOn);

  // 开机定位+自检期间屏蔽 2 号关钥匙收回（waitServoSettle 里会跑 tickStealthKeyWindow）
  bootSettleUntil = millis() + BOOT_SETTLE_MS + 16000UL;
  keyDbgLine(F("BOOT_GUARD_ON"));

  // 上电先稳压 + 指示灯，再发开机目标角
  bootPwrSettleWait();

  if (travelModeOn) {
    // 出行模式：冷启动也不走开机上/下翻定位
    keyDbgLine(F("BOOT_TRAVEL_SKIP_FLIP"));
    statusLedUpdate();
  } else if (powerOnFlip == 0) {
    // 折回（界面左）：不闪，直接折回
    bootPin5Gate = 1;
    keyDbgLine(F("BOOT_FOLD_START"));
    bootMoveToFold();
    bootPin5Gate = 0;
    keyDbgKv(F("BOOT_FOLD_DONE"), item, lastWrittenAngle);
  } else {
    // 下翻（界面右）：慢闪 5 次 → 按键取消，走 180° 归位再 item4 / 否则下翻展开
    bootPin5Gate = 1;
    keyDbgLine(F("BOOT_FOLD_PROMPT"));
    if (bootBlinkFoldBootPrompt()) {
      bootWaitPin5Release();
      digitalWrite(8, LOW);
      keyDbgLine(F("BOOT_FOLD_DETOUR"));
      bootMoveToFoldWithDetour();
      bootSuppressBtn5Click = 1;
      keyDbgKv(F("BOOT_FOLD_DONE"), item, lastWrittenAngle);
      statusLedUpdate();
    } else {
      bootTravelStyleOpenDown();
    }
    bootPin5Gate = 0;
  }

  statusLedUpdate();

  releasePin9KeyOffHold();
  pendingKeyOffFold = 0;
  travelKeyOnRestoreOpen = 0;
  bootSettleUntil = millis() + BOOT_SETTLE_MS;
  keyDbgKv(F("SETUP_DONE"), item, digitalRead(2));
  keyDbgLine(F("BOOT_GUARD_OFF"));

  btn5Init();

  digitalWrite(9, HIGH);
  updatePin9Power();
  watchdogBegin();
}

void loop() {
  watchdogFeed();
  btn5ServiceTick();
  pollBleSerial();
  btn5ServiceTick();
  tickStealthKeyWindow();
  tickKeyOffServoIdlePwm();
  updatePin9Power();
  tickPin9PowerWatchdog();
  tickTravelMinute();

  if (item == 3) {
    if (!servoPwmOff) servoStopHold();
    tickStealthMinute();
    statusLedUpdate();
    tickFaultAlarm();
    sendStatusPacket();
    btn5ServiceTick();
    return;
  }

  if (pendingKeyOffFold && keyOffRetractEnabled() && keyOffRetractEligible() &&
      item != 0 && item != 3 && !inBootSettle() && !autoLevelBusy) {
    keyDbgLine(F("PENDING_KEY_OFF_FOLD"));
    pendingKeyOffFold = 0;
    requestFlapClose(false);
  }

  tickReboundStateMachine();
  sendStatusPacket();
  tickServoPwmHold();
  if (motionCheckActive() && !autoLevelBusy && !inBootSettle()) {
    selfCheckTick();
  }
  statusLedUpdate();
  tickFaultAlarm();
  btn5ServiceTick();

  if (item == 0 || item == 1) {
    updateServoOutput();
  } else if (item == 2) {
    requestFlapClose(false);
  }

  tickAccRetractJudge();
  tickKeyOffRetractDone();
}
