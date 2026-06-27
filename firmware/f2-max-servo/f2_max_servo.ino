#include <EEPROM.h>
#include <SoftwareSerial.h>
#include <avr/pgmspace.h>
#include <avr/wdt.h>
#include <string.h>

/*
 * F2 MAX 完整固件（F2 Max / F2 Ultra 共用同一份，仅小程序展示名称不同）
 * 请使用 ATmega328P 烧录（Nano 选 cpu=atmega328old 或 atmega328）。
 * ATmega168P 仅 14KB 程序区，无法容纳本固件全部功能，编译会报 Sketch too big。
 * 168 与 328 引脚兼容，可更换芯片后使用完整功能。
 *
 * 维护说明：只改本文件 firmware/f2-max-servo/f2_max_servo.ino，勿再维护 f2-ultra-servo 副本。
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

// 168 仅 14336 字节程序区，无法烧录完整固件；328P 可开串口调试与蓝牙状态回传
#if defined(__AVR_ATmega168__) || defined(__AVR_ATmega168P__) || defined(__AVR_ATmega168PA__)
#define F2_SERIAL_DEBUG 0
#define F2_BLE_STATUS 0
#else
#define F2_SERIAL_DEBUG 1
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
volatile unsigned long lastStallSampleMs;
volatile unsigned long accReonStart;
volatile uint8_t stealthActive;
volatile int accSysTime;
volatile int delayPowerOffMin;
volatile uint8_t userServoSpeed;
volatile unsigned long stealthWindowStart;
volatile unsigned long pin9HoldUntil;
volatile uint8_t pin9HoldExpired;
volatile uint8_t pendingKeyOffFold;
volatile uint8_t travelModeOn;
volatile int travelSavedDelayMin;
volatile uint16_t travelElapsedMin;
volatile unsigned long travelMinuteMark;
volatile uint16_t stealthElapsedMin;
volatile unsigned long stealthMinuteMark;

const unsigned long STEALTH_ENTRY_WINDOW_MS = 10000UL;
const unsigned long KEY_ON_DEBOUNCE_MS = 800UL;
// 关钥匙后至少保持 Pin9 高电平这么久；此期间忽略 Pin2 回高取消（防收回时 ACC 抖动误断电）
const unsigned long KEY_ON_RELEASE_MIN_HOLD_MS = 3000UL;
const uint16_t STEALTH_AUTO_OFF_MIN = 180;
const int STEALTH_BLINK_ON_MS = 220;
const int STEALTH_BLINK_OFF_MS = 220;
const int STEALTH_ACK_ON_MS = 300;
const int STEALTH_ACK_OFF_MS = 300;
const int ACC_OPTO_FAULT_NEED = 6;
const unsigned long OPEN_GUARD_MS = 5000UL;
const unsigned long OPEN_GUARD_SMOOTH_MS = 8000UL;
const unsigned long REBOUND_RETRY_WAIT_MS = 800UL;
const int STALL_CURRENT_DEFAULT = 900;
const int STALL_HIT_NEED = 4;
const int STALL_REBOUND_HIT_NEED = 3;
const int STALL_REBOUND_SENS_MARGIN = 60;
const int STALL_REBOUND_HYST = 25;
const unsigned long STALL_SAMPLE_GAP_MS = 80UL;
const unsigned long STALL_REBOUND_SAMPLE_GAP_MS = 50UL;
const unsigned long OPEN_GUARD_REBOUND_MS = 12000UL;
const int STALL_JUDGE_MIN = 300;
const int STALL_JUDGE_MAX = 980;
const int AUTO_LEVEL_FOLD_THR = 900;
const int AUTO_LEVEL_OPEN_THR = 900;
const int SMOOTH_TAIL_DEG = 24;
const int SMOOTH_FAST_STEP_DEG = 4;
const unsigned int SMOOTH_FAST_STEP_MS = 1;
const int SMOOTH_DELAY_MIN = 20;
const int SMOOTH_DELAY_MAX = 72;
const uint8_t SMOOTH_TAIL_SPEED_MIN = 16;
const uint8_t SMOOTH_TAIL_SPEED_MAX = 100;
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
// 到位后再保持 PWM 的时长；过长会持续输出保持脉冲导致舵机微抖，waitServoSettle 已确认到位
const unsigned long SERVO_PWM_HOLD_MS = 5000UL;

const char CMD_OPEN[] PROGMEM = "\xE6\x89\x93\xE5\xBC\x80";
const char CMD_CLOSE[] PROGMEM = "\xE5\x85\xB3\xE9\x97\xAD";
const char CMD_SMOOTH_ON[] PROGMEM = "\xE5\xBC\x80\xE5\x90\xAF\xE5\xB9\xB3\xE6\xBB\x91";
const char CMD_SMOOTH_OFF[] PROGMEM = "\xE5\x85\xB3\xE9\x97\xAD\xE5\xB9\xB3\xE6\xBB\x91";
const char CMD_AUTO_LEVEL[] PROGMEM = "\xE8\x87\xAA\xE5\x8A\xA8\xE8\xB0\x83\xE5\xB9\xB3";
const char CMD_ACC_ON[] PROGMEM = "\xE6\x89\x93\xE5\xBC\x80\xE6\x94\xB6\xE5\x9B\x9E";
const char CMD_ACC_OFF[] PROGMEM = "\xE5\x85\xB3\xE9\x97\xAD\xE6\x94\xB6\xE5\x9B\x9E";
const char CMD_CHECK_ON[] PROGMEM = "\xE5\xBC\x80\xE5\x90\xAF\xE8\x87\xAA\xE6\xA3\x80";
const char CMD_CHECK_OFF[] PROGMEM = "\xE5\x85\xB3\xE9\x97\xAD\xE8\x87\xAA\xE6\xA3\x80";
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
const char CMD_DELAY_PWR[] PROGMEM = "\xE5\xBB\xB6\xE6\x97\xB6\xE6\x96\xAD\xE7\x94\xB5";
const char CMD_TRAVEL_ON[] PROGMEM = "\xE5\xBC\x80\xE5\x90\xAF\xE5\x87\xBA\xE8\xA1\x8C";
const char CMD_TRAVEL_OFF[] PROGMEM = "\xE5\x85\xB3\xE9\x97\xAD\xE5\x87\xBA\xE8\xA1\x8C";
const char CMD_SPEED[] PROGMEM = "\xE8\xB0\x83\xE9\x80\x9F";
const uint8_t SERVO_SPEED_MIN_PCT = 10;
const uint8_t SERVO_SPEED_MAX_PCT = 100;
const uint8_t SERVO_SPEED_DEFAULT_PCT = 100;
const int DELAY_PWR_MIN_MAX = 10080;
const unsigned long TRAVEL_HOLD_MS = 180000UL;
const int TRAVEL_DEFAULT_DELAY_MIN = 5;
const uint16_t TRAVEL_AUTO_OFF_MIN = 1440;

void handleBleCommand(char *cmd);

void foldToRetract();
void retractForStall();
void requestFlapOpen(bool stallRetry = false);
void requestFlapClose();
void updatePin9Power();
void watchdogFeed();
void watchdogBegin();
void serviceInputsPoll();
void btn5ServiceTick();
void btn5Init();
void btn5NoteStealthExited();
void statusLedUpdate();
void blinkPin8(uint8_t times, int onMs, int offMs);
void enterStealthMode();
void exitStealthMode();
void tickStealthMinute();

SoftwareSerial mySerial(6, 7);

char rxBuf[RX_BUF_SIZE];
uint8_t rxLen = 0;
int lastWrittenAngle = -1;
int servoTrackItem = -1;
int servoTrackAngle = -1;
uint8_t foldHoldActive = 0;
uint8_t openEaseActive = 0;
uint8_t servoPwmOff = 1;
uint8_t forceServoMove = 0;
unsigned long servoPwmHoldUntil = 0;
uint8_t autoLevelBusy = 0;
uint8_t autoLevelDone = 0;

int lastMotorA0 = -1;
unsigned long lastMotorSampleMs = 0;
unsigned long bootSettleUntil = 0;

bool sampleStallDuringOpen();
void debugPrintOpenA0();

#if F2_VARSERVO
VarSpeedServo servo;
#else
Servo servo;
#endif

void servoStopHold() {
#if F2_VARSERVO
  servo.stop();
#endif
  servo.detach();
  servoPwmOff = 1;
  servoPwmHoldUntil = 0;
}

void servoCancelPwmHold() {
  servoPwmHoldUntil = 0;
}

void servoSchedulePwmRelease() {
  if (servoPwmOff || item == 3) return;
  // 已排程则勿重置，否则 loop 里 updateServoOutput 每圈刷新导致永不断开
  if (servoPwmHoldUntil != 0) return;
  servoPwmHoldUntil = millis() + SERVO_PWM_HOLD_MS;
}

// 运动结束：锁定最终角度并停止 VarSpeedServo 内部步进，再排程断 PWM
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
  servoSchedulePwmRelease();
}

void servoPrepareMove() {
  if (item == 3) return;
  servoCancelPwmHold();
  if (servoPwmOff) {
    servo.attach(4);
    servoPwmOff = 0;
  }
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

void delayWithBlePoll(unsigned long ms);
int readServoAngle();

// 数字舵机到位后需停 PWM，否则会持续保持信号导致抖动
void waitServoSettle(int target) {
  int start = lastWrittenAngle;
  if (start < 0 || start > 180) start = readServoAngle();
  unsigned long moveMs = (unsigned long)abs(target - start) * 28UL + 250UL;
  if (moveMs < 250UL) moveMs = 250UL;
  if (moveMs > 2500UL) moveMs = 2500UL;
  unsigned long deadline = millis() + moveMs;
  while (millis() < deadline) {
    delayWithBlePoll(20);
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
void tickSelfCheckSampleWithA0(int a0);

bool openMotionActive() {
  if (item != 1) return false;
  return openEaseActive || !servoAtAngle(bianlaing);
}

bool inBootSettle() {
  return bootSettleUntil != 0 && millis() < bootSettleUntil;
}

// 按键 Pin5 需连续为低才认定按下，避免浮空误触发开机自检开合
bool pin5DebouncedLow(uint8_t needSamples) {
  for (uint8_t i = 0; i < needSamples; i++) {
    if (digitalRead(5) != LOW) return false;
    delay(25);
  }
  return true;
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
  while ((long)(millis() - endAt) < 0) {
    btn5ServiceTick();
    btn5ServiceTick();
    watchdogFeed();
    updatePin9Power();
    if (!autoLevelBusy && item == 1) {
      sampleStallDuringOpen();
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
  if (travelModeOn) return TRAVEL_HOLD_MS;
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
  accSysTime = 0;
#if F2_SERIAL_DEBUG
  debugLogPin9(F("RELEASE"), HIGH);
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
  return pin9HoldUntil != 0 && millis() < pin9HoldUntil;
}

bool pin9HoldActiveNow() {
  return item == 3 || isKeyOffPin9HoldWindow();
}

void enableTravelMode() {
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
  if (!travelModeOn) return;
  if (travelMinuteMark == 0) travelMinuteMark = millis();
  if (millis() - travelMinuteMark < 60000UL) return;
  travelMinuteMark += 60000UL;
  travelElapsedMin++;
  if (travelElapsedMin >= TRAVEL_AUTO_OFF_MIN) {
    disableTravelMode();
  } else {
    EEPROM.put(21, travelElapsedMin);
  }
}

// 关钥匙沿：出行模式 3 分钟内再开钥匙自动放牌；24 小时内循环有效
void tickStealthKeyWindow() {
  bool pin2High = digitalRead(2) == HIGH;
  static bool lastPin2High = true;
  static unsigned long keyOnStableMs = 0;
  static uint8_t travelAutoOpenPending = 0;

  if (lastPin2High && !pin2High) {
    accSysTime = 0;
    keyOnStableMs = 0;
    if (!pin9HoldExpired) {
      armPin9KeyOffHold();
    }
    updatePin9Power();
    if (item == 1) {
      pendingKeyOffFold = 1;
#if F2_SERIAL_DEBUG
      Serial.println(F("KEY off pending fold"));
#endif
    }
    if (travelModeOn) {
      travelAutoOpenPending = 1;
    }
#if F2_SERIAL_DEBUG
    Serial.println(travelModeOn ? F("TRAVEL key off fold+hold 3m") : F("KEY off edge"));
#endif
  }

  if (pin2High) {
    if (keyOnStableMs == 0) keyOnStableMs = millis();
    else if (millis() - keyOnStableMs >= KEY_ON_DEBOUNCE_MS) {
      if (travelAutoOpenPending && travelModeOn && stealthWindowStart != 0 &&
          item != 1 && !autoLevelBusy) {
        unsigned long held = millis() - stealthWindowStart;
        if (held < TRAVEL_HOLD_MS) {
          travelAutoOpenPending = 0;
          requestFlapOpen();
#if F2_SERIAL_DEBUG
          Serial.println(F("TRAVEL key on auto open"));
#endif
        } else {
          travelAutoOpenPending = 0;
        }
      }
      bool allowRelease = true;
      if (pin9HoldUntil != 0 && millis() < pin9HoldUntil && stealthWindowStart != 0) {
        if (millis() - stealthWindowStart < KEY_ON_RELEASE_MIN_HOLD_MS) {
          allowRelease = false;
        }
      }
      if (allowRelease) {
        releasePin9KeyOffHold();
      }
      keyOnStableMs = 0;
    }
  } else {
    keyOnStableMs = 0;
  }

  lastPin2High = pin2High;
}

/* =============================================================================
 * BLOCK: Stealth mode — 隐蔽模式（蓝牙/按键均可进入；平时与关钥匙后均有效）
 * ============================================================================= */
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
  reboundWaitUntil = 0;
  reboundAttempt = 0;

  uint8_t needFold = (item == 1 || !servoAtAngle(item4)) ? 1 : 0;

  item = 3;
  stealthActive = 1;
  stealthElapsedMin = 0;
  stealthMinuteMark = millis();
  updatePin9Power();
  servoStopHold();

  digitalWrite(8, HIGH);
  stealthAckBlink(3);

  if (needFold) {
    item = 0;
    forceServoMove = 1;
    invalidateServoHold();
    foldHoldActive = 0;
    if (!servoAtAngle(item4)) {
      writeServo(item4);
    }
    // 收起动作完成后立即断 PWM；item==3 时 loop 不跑 tickServoPwmHold
    servoStopHold();
    item = 3;
    stealthActive = 1;
    updatePin9Power();
  }

  invalidateServoHold();
  foldHoldActive = 0;
  openEaseActive = 0;
  forceServoMove = 0;
  servoStopHold();
  digitalWrite(8, LOW);
#if F2_SERIAL_DEBUG
  Serial.println(F("STEALTH enter"));
#endif
}

void exitStealthMode() {
  digitalWrite(8, HIGH);
  stealthAckBlink(5);

  stealthActive = 0;
  item = 0;
  stealthElapsedMin = 0;
  stealthMinuteMark = 0;
  invalidateServoHold();
  foldHoldActive = 0;
  forceServoMove = 1;
  updatePin9Power();
  statusLedUpdate();
  btn5NoteStealthExited();
#if F2_SERIAL_DEBUG
  Serial.println(F("STEALTH exit"));
#endif
}

void tickStealthMinute() {
  if (item != 3) return;
  if (stealthMinuteMark == 0) stealthMinuteMark = millis();
  if (millis() - stealthMinuteMark < 60000UL) return;
  stealthMinuteMark += 60000UL;
  stealthElapsedMin++;
  if (stealthElapsedMin >= STEALTH_AUTO_OFF_MIN) {
#if F2_SERIAL_DEBUG
    Serial.println(F("STEALTH auto off 3h"));
#endif
    exitStealthMode();
  }
}

// Pin9：关钥匙保持窗口内必须全程高电平；仅计时结束后才拉低断电
void updatePin9Power() {
  unsigned long now = millis();
  uint8_t level = HIGH;
#if F2_SERIAL_DEBUG
  const __FlashStringHelper *tag = F("ACC_ON");
#endif

  if (item == 3) {
    level = HIGH;
#if F2_SERIAL_DEBUG
    tag = F("STEALTH");
#endif
  } else if (pin9HoldUntil != 0 && now < pin9HoldUntil) {
    level = HIGH;
#if F2_SERIAL_DEBUG
    tag = F("HOLD_WIN");
#endif
  } else if (pin9HoldUntil != 0 && now >= pin9HoldUntil) {
    expirePin9KeyOffHold();
    level = LOW;
#if F2_SERIAL_DEBUG
    tag = F("HOLD_DONE");
#endif
  } else if (pin9HoldExpired) {
    // 保持已到期：Pin9 锁定低电平，直到钥匙稳定开（releasePin9KeyOffHold 清除 exp）
    level = LOW;
#if F2_SERIAL_DEBUG
    tag = F("EXPIRED_LOCK");
#endif
  } else if (digitalRead(2) == LOW) {
    if (!inBootSettle()) {
      armPin9KeyOffHold();
      level = HIGH;
#if F2_SERIAL_DEBUG
      tag = F("KEY_OFF_ARM");
#endif
    } else {
      level = LOW;
#if F2_SERIAL_DEBUG
      tag = F("KEY_OFF_BOOT");
#endif
    }
  } else {
    level = HIGH;
#if F2_SERIAL_DEBUG
    tag = F("ACC_ON");
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

// 打开收回：仅舵机归零 + 系统时间光耦检测（不控制 Pin9）
void tickAccRetractJudge() {
  if (inBootSettle()) return;
  if (item == 3 || travelModeOn) return;
  if (accRetractOn != 1) return;
  if (digitalRead(2) != LOW) return;

  if (item != 0 || !servoAtAngle(item4)) {
    item = 0;
    invalidateServoHold();
    writeServo(item4);
  }

  delayWithBlePoll(1500);
  delayWithBlePoll(100);
  accSysTime++;
#if F2_SERIAL_DEBUG
  Serial.print(F("ACC retract sys="));
  Serial.println(accSysTime);
#endif
  if (accSysTime >= ACC_OPTO_FAULT_NEED) {
    accRetractOn = 0;
    EEPROM.put(5, accRetractOn);
    blinkPin8(3, 100, 100);
#if F2_SERIAL_DEBUG
    Serial.println(F("ACC opto fault off"));
#endif
  }

  if (item == 0 && servoAtAngle(item4)) {
    servoTrackItem = 0;
    servoTrackAngle = item4;
    foldHoldActive = 1;
  }
}

int readServoAngle() {
  if (forceServoMove || openEaseActive || reboundAttempt >= 1) {
    int live = servo.read();
    if (live >= 0 && live <= 180) return live;
  }
  if (lastWrittenAngle >= 0 && lastWrittenAngle <= 180) return lastWrittenAngle;
  int cur = servo.read();
  if (cur < 0 || cur > 180) cur = 0;
  return cur;
}

/* =============================================================================
 * BLOCK: Status LED (Pin8) — 翻开亮 / 折回灭
 * ============================================================================= */
void statusLedUpdate() {
  if (item == 3) {
    digitalWrite(8, LOW);
    return;
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
  servoCancelPwmHold();
}

void abortOpenMotion() {
  openEaseActive = 0;
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
    debugPrintOpenA0();
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
    debugPrintOpenA0();
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
  if (selfCheckOn == 1) {
    isRunning = 2;
    singleExec = 1;
  }
  servoFinalizePosition(target);
}

// 平滑：前段全速大步，末段 1° 步进 + 延时与降速；打开/关闭共用，速度由 userServoSpeed 统一调节
void writeServoEase(int target) {
  int startAngle = readServoAngle();
  if (startAngle == target) {
    servoReleaseAtTarget(target);
    return;
  }
  int motionItem = item;
  servoAttachForMove();
  openEaseActive = 1;
  int cur = startAngle;
  int dir = (target > cur) ? 1 : -1;
  int steps = abs(target - cur);
  int tail = (steps < SMOOTH_TAIL_DEG) ? steps : SMOOTH_TAIL_DEG;
  int fastEnd = target - dir * tail;

  while (cur != fastEnd) {
    if (item != motionItem) {
      openEaseActive = 0;
      return;
    }
    int chunk = abs(fastEnd - cur);
    if (chunk > SMOOTH_FAST_STEP_DEG) chunk = SMOOTH_FAST_STEP_DEG;
    cur += dir * chunk;
    servoWriteEaseStep(cur, getUserServoSpeedByte());
    lastWrittenAngle = cur;
    if (motionItem == 1) debugPrintOpenA0();
    if (item != motionItem) {
      openEaseActive = 0;
      return;
    }
    if (motionItem == 1 && sampleStallDuringOpen()) {
      openEaseActive = 0;
      statusLedUpdate();
      return;
    }
    delayWithBlePoll(scaleMoveDelayMs(SMOOTH_FAST_STEP_MS));
  }

  for (int i = 0; i < tail; i++) {
    if (item != motionItem) {
      openEaseActive = 0;
      return;
    }
    cur += dir;
    int p = (i + 1) * 100 / tail;
    int delayMs = SMOOTH_DELAY_MIN + (int)((long)(SMOOTH_DELAY_MAX - SMOOTH_DELAY_MIN) * p / 100);
    delayMs = scaleMoveDelayMs((unsigned int)delayMs);
#if F2_VARSERVO
    uint8_t spd = SMOOTH_TAIL_SPEED_MAX -
      (uint8_t)((long)(SMOOTH_TAIL_SPEED_MAX - SMOOTH_TAIL_SPEED_MIN) * p / 100);
    if (spd < SMOOTH_TAIL_SPEED_MIN) spd = SMOOTH_TAIL_SPEED_MIN;
    servoWriteEaseStep(cur, scaleServoSpeed(spd));
#else
    servo.write(cur);
#endif
    lastWrittenAngle = cur;
    if (motionItem == 1) debugPrintOpenA0();
    if (item != motionItem) {
      openEaseActive = 0;
      return;
    }
    if (motionItem == 1 && sampleStallDuringOpen()) {
      openEaseActive = 0;
      statusLedUpdate();
      return;
    }
    delayWithBlePoll((unsigned int)delayMs);
  }

  openEaseActive = 0;
  if (item != motionItem) return;
  lastWrittenAngle = target;
  servoTrackItem = item;
  servoTrackAngle = target;
  if (motionItem == 0) foldHoldActive = 1;
  else foldHoldActive = 0;
  statusLedUpdate();
  if (motionItem == 1 && selfCheckOn == 1) {
    isRunning = 2;
    singleExec = 1;
  }
  servoFinalizePosition(target);
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

  // 堵转反弹后的试探打开：与首次打开共用检测逻辑；重试用足够扭矩便于采样
  if (reboundAttempt >= 1 && item == 1 && angle == bianlaing) {
    if (pdSmooth == 1) {
      writeServoEase(angle);
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
      servoFinalizePosition(angle);
    }
    if (servoAtAngle(angle) && !openEaseActive && item == 1) {
      servoTrackItem = item;
      servoTrackAngle = angle;
      foldHoldActive = 0;
      reboundAttempt = 0;
    }
    return;
  }

  // 平滑模式：打开/关闭走同一套分段速度（userServoSpeed 同步生效）
  if (pdSmooth == 1) {
    bool flapOpen = (item == 1 && angle == bianlaing);
    bool flapClose = (item == 0 && angle == item4);
    if (flapOpen || flapClose) {
      writeServoEase(angle);
      if (servoAtAngle(angle) && !openEaseActive) {
        servoTrackItem = item;
        servoTrackAngle = angle;
        if (item == 0) foldHoldActive = 1;
        else foldHoldActive = 0;
      }
      return;
    }
  }

  // 到位后延迟 10 秒再断 PWM；forceServoMove 时强制执行
  if (!forceServoMove && servoMoveCommitted(angle)) {
    servoTrackItem = item;
    servoTrackAngle = angle;
    if (item == 0) foldHoldActive = 1;
    else foldHoldActive = 0;
    servoSchedulePwmRelease();
    return;
  }
  forceServoMove = 0;

  bool flapOpen = (item == 1 && angle == bianlaing);
  bool flapClose = (item == 0 && angle == item4);

  servoPrepareMove();
#if F2_VARSERVO
  servo.write(angle, getUserServoSpeedByte());
#else
  servo.write(angle);
#endif
  if (flapOpen || flapClose) {
    lastWrittenAngle = readServoAngle();
  } else {
    lastWrittenAngle = angle;
  }
  servoTrackItem = item;
  servoTrackAngle = angle;
  if (item == 0) foldHoldActive = 1;
  else foldHoldActive = 0;
  waitServoSettle(angle);
  if (flapOpen || flapClose) {
    statusLedUpdate();
  }
  if (angle == bianlaing && item != 1) return;
  if (angle == item4 && item != 0) return;
  servoFinalizePosition(angle);
}

// 仅在模式或目标角度变化时写舵机，避免折叠态每圈 loop 重复 write 导致抽搐
void updateServoOutput() {
  if (reboundWaitUntil > 0) return;

  int target = (item == 1) ? bianlaing : item4;
  if (item == 0) {
    if (foldHoldActive && servoMoveCommitted(target)) {
      servoSchedulePwmRelease();
      return;
    }
    if (servoMoveCommitted(target)) {
      foldHoldActive = 1;
      servoSchedulePwmRelease();
      return;
    }
  }
  if (item == 1) {
    if (servoMoveCommitted(target)) {
      servoSchedulePwmRelease();
      return;
    }
    foldHoldActive = 0;
  }
  if (servoTrackItem == item && servoTrackAngle == target && servoMoveCommitted(target)) {
    servoSchedulePwmRelease();
    return;
  }

  writeServo(target);
}

void debugPrintOpenA0() {
#if F2_SERIAL_DEBUG
  if (item != 1) return;
  if (!openMotionActive()) return;
  static unsigned long lastDbg = 0;
  unsigned long now = millis();
  if (now - lastDbg < 120) return;
  lastDbg = now;

  int a0 = (lastMotorA0 >= 0 && (now - lastMotorSampleMs) < 300UL)
    ? lastMotorA0 : analogRead(A0);
  int th = stallDetectThreshold();
  Serial.print(F("A0="));
  Serial.print(a0);
  Serial.print(F(" <"));
  Serial.print(th);
  Serial.print(F(" ? "));
  Serial.print(a0 <= th ? F("Y") : F("N"));
  Serial.print(F(" cnt="));
  Serial.print(reboundStuckCount);
  Serial.print(F("/"));
  Serial.print(stallHitNeed());
  Serial.print(F(" att="));
  Serial.print(reboundAttempt);
  Serial.print(F(" t="));
  Serial.print(now - openStartMs);
  Serial.print(F(" chk="));
  Serial.println(isRunning);
#endif
}

/* =============================================================================
 * BLOCK: Flap control — 翻开 / 折回
 * ============================================================================= */
void requestFlapOpen(bool stallRetry) {
  if (item == 1) return;
  if (item == 3 || autoLevelBusy) return;
  item = 1;
  statusLedUpdate();
  invalidateServoHold();
  lastWrittenAngle = item4;
  forceServoMove = 1;
  beginOpenAttempt(stallRetry);
  if (selfCheckOn == 1 && pdSmooth != 1) resetSelfCheckMonitor();
  lastStatusSend = 0;
}

void requestFlapClose() {
  if (item == 3 || autoLevelBusy) return;
  if (item == 0 && !openEaseActive && servoMoveCommitted(item4)) return;
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
  lastMotorA0 = -1;
}

void beginOpenAttempt(bool preserveStallCount) {
  reboundWaitUntil = 0;
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
  abortOpenMotion();
  clearFaultFlags();
  reboundWaitUntil = 0;
  reboundAttempt = 0;
  reboundStuckCount = 0;
  lastStallSampleMs = 0;
  stealthActive = 0;
  item = 0;
  statusLedUpdate();
  forceServoMove = 1;
  foldHoldActive = 0;
  invalidateServoHold();
  lastStatusSend = 0;
}

void retractForStall() {
  if (item == 3) return;
  abortOpenMotion();
  stealthActive = 0;
  item = 0;
  forceServoMove = 1;
  invalidateServoHold();
  writeServo(item4);
}

void triggerStallRebound() {
  if (reboundFaultLatched) return;

  reboundStuckCount = 0;
  lastStallSampleMs = 0;
  stealthActive = 0;

  uint8_t stallsHandled = reboundAttempt;
  retractForStall();

  if (stallsHandled + 1 < STALL_REBOUND_MAX) {
    if (selfCheckOn == 1) blinkPin8(10, 75, 75);
    reboundAttempt = stallsHandled + 1;
    reboundWaitUntil = millis() + REBOUND_RETRY_WAIT_MS;
    lastStatusSend = 0;
    sendStatusPacket();
  } else {
    reboundAttempt = STALL_REBOUND_MAX;
    reboundWaitUntil = 0;
    reboundFaultLatched = 1;
    persistFaultFlags();
    lastStatusSend = 0;
    sendStatusPacket();
    if (selfCheckOn == 1) faultAlarmLoop(1);
  }
}

void tickSelfCheckSampleWithA0(int a0) {
  if (autoLevelBusy) return;
  if (selfCheckOn != 1 || item != 1) return;
  if (!openMotionActive()) return;

  if (singleExec == 0) {
    stuckCount = 0;
    isRunning = 0;
    singleExec = 1;
    selfCheckStartMs = millis();
  }
  int runThreshold = (judgeVal > 0) ? judgeVal : STALL_CURRENT_DEFAULT;
  if (a0 <= runThreshold) isRunning = 2;
}

bool sampleStallDuringOpen() {
  if (inBootSettle()) return false;
  if (reboundFaultLatched) return false;
  if (autoLevelBusy) return false;
  if (selfCheckOn != 1) {
    reboundStuckCount = 0;
    return false;
  }
  if (item != 1) {
    reboundStuckCount = 0;
    lastMotorSampleMs = 0;
    return false;
  }
  if (!openMotionActive()) {
    reboundStuckCount = 0;
    return false;
  }

  unsigned long now = millis();
  if (now - lastMotorSampleMs < stallSampleGapMs()) return false;
  lastMotorSampleMs = now;

  lastMotorA0 = analogRead(A0);
  tickSelfCheckSampleWithA0(lastMotorA0);

  unsigned long elapsed = now - openStartMs;
  if (reboundAttempt >= 1 && elapsed < OPEN_REBOUND_GRACE_MS) return false;
  if (elapsed > openGuardLimitMs()) {
#if F2_SERIAL_DEBUG
    static unsigned long guardLoggedFor = 0;
    if (guardLoggedFor != openStartMs) {
      guardLoggedFor = openStartMs;
      Serial.print(F("STALL window end cnt="));
      Serial.print(reboundStuckCount);
      Serial.print(F("/"));
      Serial.println(stallHitNeed());
    }
#endif
    return false;
  }

  int th = stallDetectThreshold();
  int need = stallHitNeed();

  if (lastMotorA0 <= th) {
    reboundStuckCount++;
#if F2_SERIAL_DEBUG
    Serial.print(F("STALL+ "));
    Serial.print(lastMotorA0);
    Serial.print(F(" cnt="));
    Serial.print(reboundStuckCount);
    Serial.print(F("/"));
    Serial.print(need);
    Serial.print(F(" att="));
    Serial.print(reboundAttempt);
    Serial.print(F(" t="));
    Serial.println(elapsed);
#endif
    if (reboundStuckCount >= need) {
#if F2_SERIAL_DEBUG
      Serial.println(F("STALL TRIGGER"));
#endif
      triggerStallRebound();
      return true;
    }
  } else {
    if (reboundAttempt >= 1) {
      if (lastMotorA0 > th + STALL_REBOUND_HYST) reboundStuckCount = 0;
    } else {
      reboundStuckCount = 0;
    }
#if F2_SERIAL_DEBUG
    Serial.print(F("STALL- "));
    Serial.print(lastMotorA0);
    Serial.print(F(" cnt="));
    Serial.print(reboundStuckCount);
    Serial.print(F("/"));
    Serial.print(need);
    Serial.print(F(" att="));
    Serial.print(reboundAttempt);
    Serial.print(F(" t="));
    Serial.println(elapsed);
#endif
  }
  return false;
}

void tickReboundStateMachine() {
  if (inBootSettle()) return;
  if (autoLevelBusy) return;
  if (selfCheckOn != 1) {
    reboundWaitUntil = 0;
    reboundAttempt = 0;
    reboundStuckCount = 0;
    return;
  }
  if (reboundFaultLatched) {
    faultAlarmLoop(1);
    return;
  }
  if (reboundWaitUntil > 0) {
    if (millis() >= reboundWaitUntil) {
      reboundWaitUntil = 0;
      reboundStuckCount = 0;
      resetOpenGuard();
      requestFlapOpen(true);
#if F2_SERIAL_DEBUG
      Serial.println(F("RETRY OPEN"));
#endif
    }
    return;
  }
  sampleStallDuringOpen();
}

void persistFaultFlags() {
  EEPROM.put(23, faultMotorLatched ? (uint8_t)1 : (uint8_t)0);
  EEPROM.put(24, reboundFaultLatched ? (uint8_t)1 : (uint8_t)0);
}

void loadFaultFlagsFromEeprom() {
  uint8_t m = 0;
  uint8_t r = 0;
  EEPROM.get(23, m);
  EEPROM.get(24, r);
  faultMotorLatched = (m == 1) ? 1 : 0;
  reboundFaultLatched = (r == 1) ? 1 : 0;
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
  persistFaultFlags();
}

#if F2_BLE_STATUS
uint8_t getFaultErr() {
  if (selfCheckOn != 1) return 0;
  if (reboundFaultLatched) return 2;
  if (faultMotorLatched) return 1;
  return 0;
}

uint8_t getFaultWrn() {
  if (reboundWaitUntil > 0) return 1;
  if (travelModeOn) return 0;
  if (accRetractOn == 1 && digitalRead(2) == LOW && accSysTime >= 1 && accSysTime < ACC_OPTO_FAULT_NEED) {
    return 2;
  }
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
  out.print(item);
  out.print(F("|SMO:"));
  out.print(pdSmooth);
  out.print(F("|CHK:"));
  out.print(selfCheckOn);
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
  out.print(F("|TRM:"));
  if (travelModeOn && travelElapsedMin < TRAVEL_AUTO_OFF_MIN) {
    out.print((uint16_t)(TRAVEL_AUTO_OFF_MIN - travelElapsedMin));
  } else {
    out.print(0);
  }
  out.print(F("|STM:"));
  if (item == 3 && stealthElapsedMin < STEALTH_AUTO_OFF_MIN) {
    out.print((uint16_t)(STEALTH_AUTO_OFF_MIN - stealthElapsedMin));
  } else {
    out.print(0);
  }
  out.print(F("|TSD:"));
  out.print(travelSavedDelayMin);
  out.print(F("|SPD:"));
  out.print(userServoSpeed);
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
  if (rxLen > 0) return;
  if (millis() - lastReceiveTime < timeout + 20UL) return;
  uint8_t err = getFaultErr();
  uint8_t wrn = getFaultWrn();
  int accPin = digitalRead(2);
  int btnPin = digitalRead(5);
  static int lastAccPin = -1;
  static int lastBtnPin = -1;
  uint8_t ioChanged = (accPin != lastAccPin || btnPin != lastBtnPin) ? 1 : 0;
  // 钥匙/按钮变化立即上报；常态约 100ms 刷新便于小程序实时监测
  if (!ioChanged && err == 0 && wrn == 0 && millis() - lastStatusSend < 100UL) return;
  lastStatusSend = millis();
  if (ioChanged) {
    lastAccPin = accPin;
    lastBtnPin = btnPin;
  }
  int ang = (item == 1) ? bianlaing : item4;
  printStatusLine(mySerial, ang, accPin, btnPin, err, wrn, false);
#if F2_SERIAL_DEBUG
  Serial.print(F("[STA] "));
  printStatusLine(Serial, ang, accPin, btnPin, err, wrn, true);
#endif
}
#else
void sendStatusPacket() {}
#endif

void resetSelfCheckMonitor() {
  singleExec = 0;
  stuckCount = 0;
  isRunning = 0;
  selfCheckStartMs = millis();
}

void faultAlarmLoop(uint8_t triple) {
  if (selfCheckOn != 1) return;
  while (selfCheckOn == 1) {
    updatePin9Power();
    digitalWrite(8, HIGH);
    delayWithBlePoll(300);
    digitalWrite(8, LOW);
    delayWithBlePoll(300);
    digitalWrite(8, HIGH);
    delayWithBlePoll(300);
    digitalWrite(8, LOW);
    delayWithBlePoll(300);
    if (triple) {
      digitalWrite(8, HIGH);
      delayWithBlePoll(300);
      digitalWrite(8, LOW);
      delayWithBlePoll(300);
    }
    digitalWrite(8, LOW);
    delayWithBlePoll(triple ? 1500 : 1000);
    sendStatusPacket();
  }
}

/* =============================================================================
 * BLOCK: Pin5 按键 — 单击翻板；按住满 2s 立即进隐蔽；隐蔽内按住 8s 退出
 * ============================================================================= */
#define BTN5_PIN 5
const unsigned long BTN5_ENTER_MS = 2000UL;
const unsigned long BTN5_EXIT_MS = 8000UL;
const unsigned long BTN5_CLICK_MS = 400UL;
const unsigned long BTN5_RELEASE_DEBOUNCE_MS = 80UL;

static unsigned long btn5DownSince = 0;
static unsigned long btn5UpSince = 0;
static unsigned long btn5ExitSince = 0;
static uint8_t btn5EnterDone = 0;
static uint8_t btn5SuppressExit = 0;

static bool btn5PinDown() {
  return digitalRead(BTN5_PIN) == LOW;
}

static void btn5ToggleFlap() {
  if (item == 3 || autoLevelBusy) return;
  lastStatusSend = 0;
  if (item == 0) {
    requestFlapOpen();
  } else {
    requestFlapClose();
  }
}

static void btn5DoEnterStealth(unsigned long heldMs) {
  if (btn5EnterDone || autoLevelBusy || item == 3) return;
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

  if (item == 3) {
    if (down) {
      if (!btn5SuppressExit) {
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

  unsigned long held = now - btn5DownSince;
  if (!btn5EnterDone && held >= BTN5_ENTER_MS) {
    btn5DoEnterStealth(held);
  } else if (!btn5EnterDone && held < BTN5_CLICK_MS) {
    btn5ToggleFlap();
  }

  btn5DownSince = 0;
  btn5UpSince = 0;
  btn5EnterDone = 0;
}

void faultCheckLoop() {
  if (selfCheckOn != 1) return;
  if (inBootSettle()) return;
  if (autoLevelBusy) return;
  if (item != 1) return;
  if (!openMotionActive()) return;
  unsigned long elapsed = millis() - selfCheckStartMs;
  unsigned long alarmMs = (pdSmooth == 1) ? 3500UL : 2200UL;
  if (elapsed > alarmMs && isRunning != 2) {
    faultMotorLatched = 1;
    persistFaultFlags();
    lastStatusSend = 0;
    sendStatusPacket();
    faultAlarmLoop(0);
  }
}

void loadJudgeValFromEeprom() {
  EEPROM.get(13, judgeVal);
  if (judgeVal < STALL_JUDGE_MIN || judgeVal > STALL_JUDGE_MAX) {
    judgeVal = STALL_CURRENT_DEFAULT;
    EEPROM.put(13, judgeVal);
  }
}

void saveJudgeValToEeprom() {
  if (judgeVal < STALL_JUDGE_MIN) judgeVal = STALL_JUDGE_MIN;
  if (judgeVal > STALL_JUDGE_MAX) judgeVal = STALL_JUDGE_MAX;
  EEPROM.put(13, judgeVal);
}

// 自动调平日志：USB(328P) + 蓝牙串口均可查看，便于排查
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

int autoScanStall(int from, int to, int thr) {
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
  int d = (to >= from) ? 1 : -1;
  for (int a = from; a != to + d; a += d) {
    servo.write(a);
    lastWrittenAngle = a;
    delayWithBlePoll(500);
    int a0 = analogRead(A0);
    autoLevelLogScan(a, a0, thr);
    if (a0 < thr) {
      autoLevelLogHit(a, a0);
      return a;
    }
  }
  autoLevelLogKV(F("ALOG SCAN end ang="), to);
  return to;
}

void runAutoLevel() {
  if (autoLevelBusy) {
    autoLevelLogLine(F("ALOG skip dup AUTO LEVEL"));
    return;
  }
  if (autoLevelDone) {
    autoLevelLogLine(F("ALOG skip already DONE"));
    return;
  }
  autoLevelBusy = 1;
  autoLevelLogLine(F("ALOG ===== AUTO LEVEL START ====="));
  servoPrepareMove();
  servo.write(120);
  lastWrittenAngle = 120;
  delayWithBlePoll(1500);

  autoLevelLogLine(F("ALOG -- find fold --"));
  y = autoScanStall(120, 180, AUTO_LEVEL_FOLD_THR);
  autoLevelLogKV(F("ALOG fold pass1 y="), y);
  y = y - 10;
  int u = autoScanStall(y, 180, AUTO_LEVEL_FOLD_THR);
  autoLevelLogKV(F("ALOG fold pass2 u="), u);
  if (u == 180) {
    item4 = 180;
    delayWithBlePoll(300);
  } else {
    item4 = u - 3;
  }
  autoLevelLogKV(F("ALOG item4="), item4);
  EEPROM.put(3, item4);

  autoLevelLogLine(F("ALOG -- find open --"));
  servo.write(90);
  lastWrittenAngle = 90;
  y = autoScanStall(90, 0, AUTO_LEVEL_OPEN_THR);
  autoLevelLogKV(F("ALOG open pass1 y="), y);
  y = y + 10;
  int m = autoScanStall(y, 0, AUTO_LEVEL_OPEN_THR);
  autoLevelLogKV(F("ALOG open pass2 m="), m);
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
  autoLevelLogKV(F("ALOG bianlaing="), bianlaing);
  EEPROM.put(1, bianlaing);

  autoLevelLogLine(F("ALOG -- finish to fold --"));
  invalidateServoHold();
  item = 0;
  writeServo(item4);
  blinkPin8(3, 100, 100);
  autoLevelLogLine(F("ALOG ===== AUTO LEVEL DONE ====="));
  saveAutoLevelDoneToEeprom();
  autoLevelBusy = 0;
  drainBleRx();
}

void adjustFoldLoop() {
  digitalWrite(8, HIGH);
  rxLen = 0;
  rxBuf[0] = 0;
  while (true) {
    digitalWrite(8, HIGH);
    updatePin9Power();
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
      if (cmdIsP(rxBuf, CMD_ADJ_BIG) && item4 > 0) {
        item4--;
        invalidateServoHold();
        writeServo(item4);
        delayWithBlePoll(300);
        EEPROM.put(3, item4);
      } else if (cmdIsP(rxBuf, CMD_ADJ_SMALL) && item4 < 180) {
        item4++;
        invalidateServoHold();
        writeServo(item4);
        delayWithBlePoll(300);
        EEPROM.put(3, item4);
      }
    }
    btn5ServiceTick();
  }
}

void handleBleCommand(char *cmd) {
  trimBuf(cmd);
  if (cmd[0] == 0) return;
#if F2_SERIAL_DEBUG
  Serial.print(F("[CMD] "));
  Serial.println(cmd);
#endif

  if (cmdIsP(cmd, CMD_STEALTH_ON)) {
    if (item != 3) enterStealthMode();
    return;
  }
  if (cmdIsP(cmd, CMD_STEALTH_OFF)) {
    if (item == 3) exitStealthMode();
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
    if (item != 1) {
      requestFlapOpen();
    }
    return;
  }
  if (cmdIsP(cmd, CMD_CLOSE)) {
    abortOpenMotion();
    requestFlapClose();
    return;
  }
  if (cmdIsP(cmd, CMD_SMOOTH_ON)) {
    pdSmooth = 1;
    eePutBlink(11, pdSmooth);
    return;
  }
  if (cmdIsP(cmd, CMD_SMOOTH_OFF)) {
    pdSmooth = 0;
    eePutBlink(11, pdSmooth);
    return;
  }
  if (cmdIsP(cmd, CMD_AUTO_LEVEL)) {
    runAutoLevel();
  } else if (cmdIsP(cmd, CMD_ACC_ON)) {
    accRetractOn = 1;
    eePutBlink(5, accRetractOn);
  } else if (cmdIsP(cmd, CMD_ACC_OFF)) {
    accRetractOn = 0;
    eePutBlink(5, accRetractOn);
  } else if (cmdIsP(cmd, CMD_CHECK_ON)) {
    selfCheckOn = 1;
    if (item == 1 && pdSmooth != 1) resetSelfCheckMonitor();
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
    faultMotorLatched = 0;
    EEPROM.put(23, (uint8_t)0);
    singleExec = 0;
    stuckCount = 0;
    isRunning = 0;
    eePutBlink(7, selfCheckOn);
  } else if (cmdIsP(cmd, CMD_UP)) {
    if (servo.read() > 180) bianlaing = 180;
    else {
      bianlaing += 2;
      invalidateServoHold();
      writeServo(bianlaing);
      delay(300);
    }
    EEPROM.put(1, bianlaing);
  } else if (cmdIsP(cmd, CMD_DOWN)) {
    if (servo.read() < 0) bianlaing = 0;
    else {
      bianlaing -= 2;
      invalidateServoHold();
      writeServo(bianlaing);
      delay(300);
    }
    EEPROM.put(1, bianlaing);
  } else if (cmdIsP(cmd, CMD_FULL_OPEN)) {
    bianlaing = fullOpenAngle;
    invalidateServoHold();
    writeServo(bianlaing);
    delay(300);
    EEPROM.put(1, bianlaing);
  } else if (cmdIsP(cmd, CMD_CUSTOM)) {
    bianlaing = customAngle;
    invalidateServoHold();
    writeServo(bianlaing);
    delay(300);
    EEPROM.put(1, bianlaing);
  } else if (cmdIsP(cmd, CMD_INIT_ANGLE)) {
    clearAutoLevelDone();
    item4 = 150;
    invalidateServoHold();
    writeServo(item4);
    delay(300);
    EEPROM.put(3, item4);
  } else if (cmdIsP(cmd, CMD_ADJ_FOLD)) {
    adjustFoldLoop();
  }
}

void bootServoSnapTo(int angle) {
  if (angle < 0) angle = 0;
  if (angle > 180) angle = 180;
  abortOpenMotion();
  servoCancelPwmHold();
  servoPrepareMove();
#if F2_VARSERVO
  servo.write(angle, 255);
#else
  servo.write(angle);
#endif
  lastWrittenAngle = angle;
  servoTrackItem = item;
  servoTrackAngle = angle;
  delay(60);
  servoFinalizePosition(angle);
}

// 开机上翻：满速一次性转到折叠位并锁定状态（不走平滑、不等自检）
void bootMoveToFold() {
  item = 0;
  stealthActive = 0;
  abortOpenMotion();
  reboundWaitUntil = 0;
  reboundAttempt = 0;
  reboundStuckCount = 0;
  singleExec = 0;
  isRunning = 0;
  foldHoldActive = 1;
  digitalWrite(8, LOW);
  bootServoSnapTo(item4);
}

void setup() {
#if F2_SERIAL_DEBUG
  Serial.begin(9600);
  Serial.println(F("F2 MAX ready"));
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
  isRunning = 1;
  stuckCount = 0;
  singleExec = 0;
  pdSmooth = 0;
  openStartMs = 0;
  reboundWaitUntil = 0;
  reboundAttempt = 0;
  reboundStuckCount = 0;
  faultMotorLatched = 0;
  reboundFaultLatched = 0;
  lastStatusSend = 0;
  selfCheckStartMs = 0;
  lastStallSampleMs = 0;
  accReonStart = 0;
  stealthActive = 0;
  accSysTime = 0;
  stealthWindowStart = 0;
  pin9HoldUntil = 0;
  pin9HoldExpired = 0;
  pendingKeyOffFold = 0;
  delayPowerOffMin = 0;
  userServoSpeed = SERVO_SPEED_DEFAULT_PCT;
  travelModeOn = 0;
  travelSavedDelayMin = 0;
  travelElapsedMin = 0;
  travelMinuteMark = 0;
  stealthElapsedMin = 0;
  stealthMinuteMark = 0;
  rxLen = 0;

  pinMode(8, OUTPUT);
  pinMode(5, INPUT_PULLUP);
  pinMode(9, OUTPUT);
  pinMode(11, OUTPUT);
  pinMode(2, INPUT);

  // 通电最先读折叠角与开机模式；开机上翻时立刻满速归位，不等待后续配置加载
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
  uint8_t bootFoldDone = 0;
  if (powerOnFlip == 0) {
    bootMoveToFold();
    bootFoldDone = 1;
  }

  EEPROM.get(1, bianlaing);
  EEPROM.get(5, accRetractOn);
  EEPROM.get(7, selfCheckOn);
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
  EEPROM.get(17, travelModeOn);
  EEPROM.get(19, travelSavedDelayMin);
  EEPROM.get(21, travelElapsedMin);
  if (travelModeOn != 0 && travelModeOn != 1) travelModeOn = 0;
  if (travelElapsedMin >= TRAVEL_AUTO_OFF_MIN) {
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
  loadFaultFlagsFromEeprom();
  loadAutoLevelDoneFromEeprom();

  if (bianlaing < 0 || bianlaing > 180) {
    bianlaing = 80;
    EEPROM.put(1, bianlaing);
  }

  if (powerOnFlip == 0) {
    if (!bootFoldDone) bootMoveToFold();
  } else {
    item = 1;
    forceServoMove = 1;
    invalidateServoHold();
    writeServo(bianlaing);
    forceServoMove = 0;
    foldHoldActive = 0;
    servoTrackItem = 1;
    servoTrackAngle = bianlaing;
    beginOpenAttempt(false);
    if (selfCheckOn == 1 && pdSmooth != 1) resetSelfCheckMonitor();
    delay(1500);
    for (int i = 0; i < 6; i++) {
      digitalWrite(8, HIGH);
      delay(200);
      digitalWrite(8, LOW);
      delay(200);
      if (pin5DebouncedLow(4)) {
        digitalWrite(8, LOW);
        requestFlapClose();
        delay(1500);
        break;
      }
    }
  }

  if (selfCheckOn == 1 && powerOnFlip != 0) {
    for (int i = 0; i < 5; i++) {
      digitalWrite(8, HIGH);
      delay(500);
      digitalWrite(8, LOW);
      delay(500);
      p++;
      if (pin5DebouncedLow(4)) {
        p = 0;
        break;
      }
    }
    if (p == 5) blinkPin8(4, 100, 100);
    // 开机上翻已在折叠位，跳过自检开合循环，避免开机抖来抖去
    if (p == 0 && powerOnFlip != 0) {
      item = 1;
      forceServoMove = 1;
      invalidateServoHold();
      writeServo(bianlaing);
      delay(1500);
      item = 0;
      forceServoMove = 1;
      invalidateServoHold();
      writeServo(item4);
      forceServoMove = 0;
      foldHoldActive = 1;
      servoTrackItem = 0;
      servoTrackAngle = item4;
      delay(1200);
      if (analogRead(A0) < 980) {
        servoStopHold();
        while (true) {
          digitalWrite(8, HIGH);
          delay(500);
          digitalWrite(8, LOW);
          delay(500);
        }
      }
      delay(1000);
    }
  }

  bootSettleUntil = millis() + BOOT_SETTLE_MS;

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
  updatePin9Power();
  tickStealthKeyWindow();
  tickTravelMinute();

  if (item == 3) {
    if (!servoPwmOff) servoStopHold();
    tickStealthMinute();
    statusLedUpdate();
    sendStatusPacket();
    btn5ServiceTick();
    return;
  }

  if (pendingKeyOffFold && item == 1 && !inBootSettle() && !autoLevelBusy) {
    pendingKeyOffFold = 0;
    requestFlapClose();
  }

  tickReboundStateMachine();
  sendStatusPacket();
  tickServoPwmHold();
  statusLedUpdate();
  btn5ServiceTick();

  if (item == 0) {
    updateServoOutput();
    if (selfCheckOn == 1 && !autoLevelBusy) faultCheckLoop();
  } else if (item == 1) {
    if (selfCheckOn == 1 && !autoLevelBusy) debugPrintOpenA0();
    updateServoOutput();
    if (selfCheckOn == 1 && !autoLevelBusy) faultCheckLoop();
  } else if (item == 2) {
    requestFlapClose();
  }

  tickAccRetractJudge();
  digitalWrite(11, HIGH);
}
