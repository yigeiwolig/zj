#include <EEPROM.h>
#include <SoftwareSerial.h>
#include <avr/pgmspace.h>
#include <avr/wdt.h>
#include <string.h>

/*
 * F3 MAX 最新代码（陀螺仪版）
 * --------------------------------
 * 去掉全部 TOF/VL53 测高，以及翻开后「未收到位」红绿爆闪检测。
 * MPU6050：倾角显示与扶正/倾斜标定；骑行只靠震动；过坑红灯锁按键。
 * 不做停车姿态自动翻板（倾斜展牌 / 扶正收回已删除）。
 * D12 照明灯可由小程序手动开关。
 * 烧录：ATmega328P Nano Old Bootloader。MPU6050：SCL=A5 SDA=A4。
 * 单文件烧录：MPU 代码已并入本文件，无需第二个 .ino。
 * 详见同目录 需求说明.txt
 */

#define F3_MAX_BUILD 1
#define F3_FLASH_TIGHT 1   // 1=省闪存可烧录；0=完整调试（可能 Sketch too big）
#define F3_SENSOR_SERIAL 0
#define F3_HEIGHT_ENABLE 0 // 最新代码：永久关闭 TOF 测高
#define F3_IMU_ENABLE 1    // MPU6050 倾角显示/标定 + 骑行震动 + 过坑 + 照明灯
#define F3_IMU_SERIAL 0    // 1=蓝牙打 IMU 诊断行（占闪存）；联调完保持 0
// 若要开串口日志：先确认能编过，或临时关掉别的调试宏腾空间
// 看日志格式（开启时）：I <ack> <addr> <who> <mok> <gok> <triesLeft>
#define F3_BLE_CMD_DEBUG 0
#define F3_BLE_RX_SERIAL 0
#define F3_BLE_RX_USB_DEBUG 0

#if F3_IMU_ENABLE
void f3ImuInit();
void f3ImuServiceTick();
void f3WorkLightApply();
uint8_t f3ImuTryHandleBleCmd(char *cmd);
void f3ImuAppendStatus(Stream &out);
uint8_t f3BumpFlapLocked();
#else
void f3WorkLightApply();
#endif

// 328P：F3 用更小 Servo 库；F2 MAX 原版用 VarSpeedServo
#if defined(__AVR_ATmega328P__) || defined(__AVR_ATmega328__) || defined(__AVR_ATmega328PB__)
#if F3_MAX_BUILD && F3_FLASH_TIGHT
#include <Servo.h>
#define F2_VARSERVO 0
#else
#include <VarSpeedServo.h>
#define F2_VARSERVO 1
#endif
#else
#include <Servo.h>
#define F2_VARSERVO 0
#endif

// 168 仅 14336 字节程序区，无法烧录完整固件；328P 可开蓝牙状态回传
#if defined(__AVR_ATmega168__) || defined(__AVR_ATmega168P__) || defined(__AVR_ATmega168PA__)
#define F2_SERIAL_DEBUG 0
#define F2_MOTION_A0_DEBUG 0
#define F2_KEY_SERIAL_DEBUG 0
#define F2_BLE_STATUS 0
#else
#define F2_SERIAL_DEBUG 0
#if F3_MAX_BUILD && F3_FLASH_TIGHT
#define F2_MOTION_A0_DEBUG 0
#define F2_KEY_SERIAL_DEBUG 0
#else
#define F2_MOTION_A0_DEBUG 1
#define F2_KEY_SERIAL_DEBUG 1
#endif
#if F3_BLE_RX_USB_DEBUG
#define F2_BLE_STATUS 0 // 临时腾出 328P 闪存给 USB RX 调试；调完改回关闭 USB 调试
#else
#define F2_BLE_STATUS 1
#endif
#endif

#if F3_HEIGHT_ENABLE
#include <Wire.h>
#endif
#include <math.h>
const uint8_t F3_SERVO_PIN = 4;
#if F3_HEIGHT_ENABLE
const unsigned int F3_SENSOR_POLL_MS = 50;
const unsigned int F3_SENSOR_POLL_OPEN_MS = 35;
const uint16_t F3_FOLD_NEAR_MM = 80;
const unsigned long F3_FOLD_CLOSE_TIMEOUT_MS = 8000UL;
const unsigned long F3_HGT_BLE_MS = 250UL;
const unsigned long F3_CFG_HGT_BLE_MS = 400UL;
const uint16_t F3_HEIGHT_MM_MIN = 10;
const uint16_t F3_HEIGHT_MM_MAX = 3000;
#endif
const unsigned long F3_FOLD_FAULT_BLINK_MS = 250UL;
const uint8_t F3_PIN_LED_GREEN = 10;
const uint8_t F3_EEPROM_MAGIC_ADDR = 38;
const uint8_t F3_EEPROM_MAGIC = 0xA7;

#if !F3_HEIGHT_ENABLE
static bool f3FlapOpenDangerBlocked();
static void stealthPersistSave(uint8_t on);
static uint8_t stealthPersistLoad();
static void stealthPersistClear();
static void f3RecoverSensor();
static bool f3ReadSample(uint16_t &mm);
static uint16_t f3FilterMm(uint16_t rawMm);
void f3SensorInit();
void servoMotionOn();
void servoMotionOff();
void servoStopHold();
void servoCancelPwmHold();
void servoSchedulePwmRelease();
void servoFinalizePosition(int angle);
void servoPrepareMove();
void tickServoPwmHold();
void servoWriteEaseStep(int angle, uint8_t speed);
static unsigned long flapMoveSettleMs(int fromAngle, int toAngle);
void tickFlapServoHold(int target);
void waitServoSettle(int target);
void servoReleaseAtTarget(int angle);
bool cmdIsP(const char *cmd, const char *refProgmem);
int parseCmdSuffixInt(const char *cmd, const char *refProgmem);
void trimBuf(char *s);
static bool bleSerialRxBusy();
static void f3BleDispatchCmd(char *cmd);
static void dispatchBleRxCmd();
void pollBleSerial();
bool flapOpenMoving();
bool flapCloseMoving();
int statusItemForBle();
bool stallCheckActive();
bool motionCheckActive();
static bool keyOffRetractEnabled();
static bool keyOffRetractEligible();
static int f3FoldUserTarget();
static int f3KeyOffFoldTarget();
static int f3FoldMotionTarget();
static void armKeyOffRetractSuppress();
static void tickKeyOffRetractDone();
int readMotorA0();
static void armStallGraceAfterUserReverse();
bool inBootSettle();
unsigned long keyOffHoldDurationMs();
void releasePin9KeyOffHold();
void cancelKeyOffHoldOnKeyOn();
void expirePin9KeyOffHold();
bool isKeyOffPin9HoldWindow();
bool isStealthEntryWindow();
bool canEnterStealthViaBtn5();
bool pin2KeyOnStable();
static void tickKeyOffServoIdlePwm();
static void stealthAckBlink(uint8_t times);
static void stealthAutoPowerOff();
void tickStealthMinute();
void tickPin9PowerWatchdog();
void tickAccRetractJudge();
static void waitServoReach(int angle);
bool servoMoveCommitted(int angle);
void requestFlapOpen(bool stallRetry);
void requestFlapClose(bool userRequest);
void eePutBlink(int addr, int val);
void resetOpenGuard();
void beginOpenAttempt(bool preserveStallCount);
void tickReboundStateMachine();
void loadPendingFaultReportFromEeprom();
void clearPendingFaultReport();
void clearFaultFlags();
static void printStatusLine(Stream &out, int ang, int accPin, int btnPin, uint8_t err, uint8_t wrn);
void resetSelfCheckMonitor();
static bool btn5PinDown();
static void btn5ToggleFlap();
static void btn5DoEnterStealth(unsigned long heldMs);
void runAutoLevel();
static void applyFoldAdjustStep(int delta);
static void bleNotifySettingSaved();
static bool handleBlePersistSetting(char *cmd);
static uint8_t bootDriveToAngle(int target);
static void bootStallRecoverLoop();
static int waitBootServoReach(int target);
static void bootMoveToTarget(int target, uint8_t itemState);
static void bootPwrSettleWait();
static void f3BootLedOn();
static void f3BootLedOff();
static void bootBlinkLeadOn();
static void bootBlinkLeadOff();
static bool bootFoldBlinkDelayPoll(unsigned long ms, unsigned long &holdSince);
static bool bootBlinkFoldBootPrompt();
static void bootFlapOpenForce();
static void bootPowerOnOpenDown();
void setup();
void loop();
static bool f3MpuWhoOk(uint8_t who);
static uint8_t f3TwiWait(uint8_t msMax);
static void f3TwiStop();
static uint8_t f3TwiStart();
static uint8_t f3TwiWriteByte(uint8_t data);
static void f3ImuBusClear();
static uint8_t f3MpuWrite(uint8_t reg, uint8_t val);
static uint8_t f3MpuRead8(uint8_t reg);
static uint8_t f3MpuReadAccelRaw(int16_t *rx, int16_t *ry, int16_t *rz);
static void f3MpuReadAccel(float *ax, float *ay, float *az);
static bool f3MpuProbeAddr(uint8_t addr);
static bool f3MpuConfigure();

static void f3ImuLoadEeprom();
static void f3ImuSaveMagic();
static void f3ImuSaveGravEeprom();
static uint8_t f3ImuLoadGravEeprom();
static void f3ImuCalibrateGravity();
static uint8_t f3ImuTryConnectOnce();
static float f3CurrentRollDeg(float ax, float ay, float az);
static bool f3FlapOpenDangerBlocked() { return false; }
#endif

#if F3_MAX_BUILD
const uint8_t F3_EE_PWR_LOCK = 15;
const uint8_t F3_EE_HEIGHT_ON = 30; // 旧测高开关 EEPROM 位；TOF 已删，仅兼容忽略 H0/H1
const uint8_t F3_EE_STEALTH_ON = 31;
const uint8_t F3_FOLD_USER_DELTA = 10;   // 日常折叠 = 锁止位 item4 − 10°
static uint8_t f3PowerOffLockOn = 0;
uint8_t stealthEntryBusy = 0; // 非 static：供 f3_mpu_park.ino extern 使用

static void stealthPersistSave(uint8_t on) {
  EEPROM.update(F3_EE_STEALTH_ON, on ? 1 : 0);
}

static uint8_t stealthPersistLoad() {
  uint8_t v = 0;
  EEPROM.get(F3_EE_STEALTH_ON, v);
  if (v != 0 && v != 1) {
    v = 0;
    EEPROM.update(F3_EE_STEALTH_ON, 0);
  }
  return v;
}

static void stealthPersistClear() {
  stealthPersistSave(0);
}
#endif

#if !F3_FLASH_TIGHT
// 长距 TOF 配置已随测高删除
#endif

const uint8_t F3_MEDIAN_WIN = 3;
const uint8_t F3_EMA_NEW = 2;
const uint8_t F3_EMA_OLD = 3;
const uint16_t F3_SNAP_MM = 80;
#if F3_HEIGHT_ENABLE
const uint8_t F3_DGD_ENTER_N = 3;
const uint8_t F3_DGD_EXIT_N = 2;
const uint16_t F3_DGD_EXIT_HYST_MM = 25;
#endif

// TOF 已永久删除；以下变量保留最小桩，避免旧调用链改爆
uint8_t f3SensorOk = 0;
uint8_t f3FailStreak = 0;
#if !F3_FLASH_TIGHT
uint16_t f3MedBuf[F3_MEDIAN_WIN];
uint8_t f3MedIdx = 0;
uint8_t f3MedCount = 0;
#endif
uint32_t f3FiltMm = 0;
uint8_t f3HasFilt = 0;
uint8_t f3SensorValid = 0;
uint16_t f3LastFiltMm = 0;
uint16_t f3LastRawMm = 0;
unsigned long f3LastPollMs = 0;
unsigned long f3SensorSkipUntil = 0;
uint8_t f3RecoverPending = 0;
static uint8_t f3BleHgtThisPkt = 0;
static unsigned long f3LastHgtBleMs = 0;
uint16_t f3DangerMm = 0;
uint16_t f3BaseMm = 0;
static unsigned long f3CfgGraceUntil = 0;
static uint8_t f3HeightCfgMode = 0;
static uint8_t f3HfCfg = 1;
static uint8_t f3ForceStatusOnce = 0;
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
static unsigned long f3FoldCloseWatchMs = 0;
static uint8_t f3FoldCloseFault = 0;
static uint8_t f3CalPreviewActive = 0;
static int f3CalPreviewAngle = 0;
#endif

bool f3HeightMonitorActive();
void f3SensorServiceTick();
void f3SensorRecoverTick();
void delayWithBlePoll(unsigned long ms);
void sendStatusPacket();
bool flapMotionMoving();
bool faultIndicatorActive();
void statusLedUpdate();
void blinkPin8(uint8_t times, int onMs, int offMs);
void blinkPin8Fault(uint8_t times, int onMs, int offMs);
extern volatile unsigned long lastStatusSend;
extern volatile int item;
extern volatile int accRetractOn;
extern uint8_t openEaseActive;
extern uint8_t foldAdjustActive;
extern uint8_t servoPwmOff;
bool pin2KeyOffStable();

bool f3DangerLedActive();
void f3TickDangerLed();
static bool f3HeightCfgModeActive();
static void f3HeightCfgModeLedApply();
static void f3RequestStatusSend();
#if F3_BLE_CMD_DEBUG
static void f3DbgLine(const __FlashStringHelper *tag);
static void f3DbgCmd(const __FlashStringHelper *tag, const char *cmd);
static void f3DbgNum2(const __FlashStringHelper *tag, uint16_t a, uint16_t b);
#endif
void f3LoadHeightFromEeprom();
static void f3ClampHeightMm(uint16_t &mm);
static void f3SaveDangerMm(uint16_t mm);
static void f3SaveBaseMm(uint16_t mm);
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
static bool f3TryShortHeightCmd(char *cmd);
static void f3CalPreviewStep(int delta);
static void f3CalFoldRestore();
#endif
#if F3_MAX_BUILD
static void f3WriteLeds(uint8_t redOn, uint8_t greenOn);
void f3StatusLedUpdate();
bool isKeyOffCountdownActive();
#endif

#if F3_SENSOR_SERIAL
unsigned long f3LastSerialMs = 0;
static void f3SerialPrintHeight(uint16_t raw, uint16_t filt, uint8_t ok) {
  unsigned long now = millis();
  if (now - f3LastSerialMs < 500UL) return;
  f3LastSerialMs = now;
  wdt_reset();
  Serial.print(F("HGT "));
  Serial.print(raw);
  Serial.print(F(" "));
  Serial.print(filt);
  Serial.print(F(" "));
  Serial.println(ok);
  wdt_reset();
}
#endif

static uint8_t f3DgdLatch = 0;
static uint8_t f3DgdSafeCnt = 0;
static uint8_t f3DgdUnsafeCnt = 0;
// 堵转锁存（后面完整定义）；测高侧只读，避免与危险灯抢指示
extern volatile uint8_t reboundFaultLatched;
extern volatile uint8_t pendingFaultReport;
extern volatile int reboundAttempt;

static void f3RecoverSensor() {
#if !F3_HEIGHT_ENABLE
  f3RecoverPending = 0;
  f3SensorOk = 0;
#else
  f3FailStreak = 0;
  wdt_reset();
  f3Tof.setTimeout(150);
  if (!f3Tof.init()) {
    f3SensorOk = 0;
    f3SensorValid = 0;
    f3RecoverPending = 1;
    f3SensorSkipUntil = millis() + 3000UL;
    wdt_reset();
    return;
  }
  wdt_reset();
  f3Tof.startContinuous(50);
  f3SensorOk = 1;
#if !F3_FLASH_TIGHT
  f3MedCount = 0;
#endif
  f3HasFilt = 0;
  f3SensorValid = 0;
  f3DgdLatch = 0;
  f3DgdSafeCnt = 0;
  f3DgdUnsafeCnt = 0;
  f3SensorSkipUntil = millis() + 500UL;
#endif
}

static bool f3ReadSample(uint16_t &mm) {
#if !F3_HEIGHT_ENABLE
  (void)mm;
  return false;
#else
  pollBleSerial();
  wdt_reset();
  unsigned long t0 = millis();
  mm = f3Tof.readRangeContinuousMillimeters();
  pollBleSerial();
  wdt_reset();
  if (millis() - t0 > 400UL || f3Tof.timeoutOccurred() || mm == 0 || mm == 65535) {
    if (++f3FailStreak >= 6) {
      f3RecoverPending = 1;
      f3SensorValid = 0;
      f3SensorSkipUntil = millis() + 1500UL;
    } else {
      f3SensorSkipUntil = millis() + 400UL;
    }
    return false;
  }
  f3FailStreak = 0;
  return true;
#endif
}

#if !F3_FLASH_TIGHT
static uint16_t f3AbsDiff(uint16_t a, uint16_t b) {
  return (a > b) ? (a - b) : (b - a);
}

static uint16_t f3MedianOfBuffer() {
  uint8_t n = f3MedCount;
  if (n <= 1) return f3MedBuf[0];
  uint16_t a = f3MedBuf[0], b = f3MedBuf[1];
  if (n == 2) return (a > b) ? a : b;
  uint16_t c = f3MedBuf[2];
  if (a > b) { uint16_t t = a; a = b; b = t; }
  if (b > c) { uint16_t t = b; b = c; c = t; }
  if (a > b) { uint16_t t = a; a = b; b = t; }
  return b;
}
#endif

static uint16_t f3FilterMm(uint16_t rawMm) {
#if F3_FLASH_TIGHT
  // 紧闪存：单级 EMA，去掉中值窗口
  if (!f3HasFilt) {
    f3FiltMm = rawMm;
    f3HasFilt = 1;
    return rawMm;
  }
  f3FiltMm = (f3FiltMm * F3_EMA_OLD + (uint32_t)rawMm * F3_EMA_NEW) / (F3_EMA_OLD + F3_EMA_NEW);
  return (uint16_t)f3FiltMm;
#else
  f3MedBuf[f3MedIdx] = rawMm;
  f3MedIdx = (f3MedIdx + 1) % F3_MEDIAN_WIN;
  if (f3MedCount < F3_MEDIAN_WIN) f3MedCount++;

  uint16_t med = f3MedianOfBuffer();
  if (!f3HasFilt) {
    f3FiltMm = med;
    f3HasFilt = 1;
    return med;
  }
  uint16_t prev = (uint16_t)f3FiltMm;
  if (med <= prev && f3AbsDiff(med, prev) > F3_SNAP_MM) {
    f3FiltMm = (prev + (uint32_t)med * 4) / 5;
  } else {
    uint8_t emN = (med > prev) ? 4 : F3_EMA_NEW;
    uint8_t emO = (med > prev) ? 1 : F3_EMA_OLD;
    f3FiltMm = (f3FiltMm * emO + med * emN) / (emO + emN);
  }
  return (uint16_t)f3FiltMm;
#endif
}

bool f3DangerLedActive() {
#if !F3_HEIGHT_ENABLE
  return false; // TOF 已永久删除
#else
  // 堵转优先：锁存期间测高危险灯不抢红灯
  if (reboundFaultLatched || pendingFaultReport == 2) {
    f3DgdLatch = f3DgdSafeCnt = f3DgdUnsafeCnt = 0;
    return 0;
  }
  if (f3HeightCfgModeActive() || (long)(millis() - f3CfgGraceUntil) < 0) {
    f3DgdLatch = f3DgdSafeCnt = f3DgdUnsafeCnt = 0;
    return 0;
  }
  if (!f3HeightMonitorActive() || f3DangerMm == 0) {
    f3DgdLatch = f3DgdSafeCnt = f3DgdUnsafeCnt = 0;
    return 0;
  }
  // 短暂丢样：保持当前锁存，避免红灯跟着测距失败一闪一闪
  if (!f3SensorValid) {
    return f3DgdLatch;
  }
  if (!f3DgdLatch) {
    // 仅用滤波值进危险：裸 raw 毛刺会误亮红灯
    uint16_t probe = f3LastFiltMm;
    if (probe && probe <= f3DangerMm) {
      if (++f3DgdUnsafeCnt >= F3_DGD_ENTER_N) {
        f3DgdLatch = 1;
        f3DgdUnsafeCnt = 0;
        f3DgdSafeCnt = 0;
      }
    } else f3DgdUnsafeCnt = 0;
  } else {
    // 退出：滤波须明显高于危险线+迟滞，才灭红灯
    uint16_t mm = f3LastFiltMm;
    if (mm > f3DangerMm + F3_DGD_EXIT_HYST_MM) {
      if (++f3DgdSafeCnt >= F3_DGD_EXIT_N) {
        f3DgdLatch = 0;
        f3DgdSafeCnt = 0;
        f3DgdUnsafeCnt = 0;
      }
    } else f3DgdSafeCnt = 0;
  }
  return f3DgdLatch;
#endif
}

#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
/** 翻开前用实时滤波高度复核，避免 DGD 锁存未清误拦 */
static bool f3FlapOpenDangerBlocked() {
  if (f3DangerMm == 0 || !f3HeightMonitorActive()) return false;
  if (!f3SensorValid || !f3LastFiltMm) return f3DgdLatch != 0;
  if (f3LastFiltMm <= f3DangerMm) {
    f3DgdLatch = 1;
    f3DgdUnsafeCnt = 0;
    f3DgdSafeCnt = 0;
    return true;
  }
  f3DgdLatch = 0;
  f3DgdUnsafeCnt = 0;
  f3DgdSafeCnt = 0;
  return false;
}
#endif

void f3SensorInit() {
#if !F3_HEIGHT_ENABLE
  f3SensorOk = 0;
  return;
#else
  Wire.begin();
  Wire.setClock(100000);
  wdt_reset();
  f3Tof.setTimeout(150);
  f3SensorOk = f3Tof.init() ? 1 : 0;
  if (!f3SensorOk) return;
#if F3_SENSOR_SERIAL
  Serial.println(F("F3 OK"));
#endif
#if !F3_FLASH_TIGHT
  f3ConfigureLongRange();
#endif
  f3Tof.startContinuous(50);
  f3LastPollMs = millis();
#endif
}

#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
static bool f3FoldCloseWatchActive();
static bool f3ServoMotionBusy();
#endif

void f3SensorRecoverTick() {
#if !F3_HEIGHT_ENABLE
  return;
#else
  if (!f3RecoverPending) return;
  if (!f3HeightMonitorActive()) return;
  // 舵机运动中禁 I2C 恢复：大电流易卡死 Wire
#if F3_MAX_BUILD
  if (f3ServoMotionBusy() || flapMotionMoving()) return;
#endif
  f3RecoverPending = 0;
  f3RecoverSensor();
#endif
}

void f3SensorServiceTick() {
#if !F3_HEIGHT_ENABLE
  return;
#else
  pollBleSerial();
  // 堵转优先：锁存期间不做测高，避免红灯/报警冲突
  if (reboundFaultLatched || pendingFaultReport == 2) return;
  bool foldOpenWatch = (item == 1 && (f3HfCfg & 1));
  if (!f3SensorOk) {
    if (item != 0 && !f3FoldCloseWatchActive()) f3SensorValid = 0;
    return;
  }
  if (!f3HeightMonitorActive() && !foldOpenWatch) {
    if (item != 0 && !f3FoldCloseWatchActive()) f3SensorValid = 0;
    return;
  }
  // 连按翻板时舵机电流噪声会卡 I2C；翻开位 8cm 监测须持续读距
#if F3_MAX_BUILD
  bool foldTof = (item <= 1 && (f3HfCfg & 1));
  if ((f3ServoMotionBusy() || flapMotionMoving()) && !foldTof) return;
#endif
  unsigned long now = millis();
  if (now < f3SensorSkipUntil) return;
  unsigned int pollMs = F3_SENSOR_POLL_MS;
#if F3_MAX_BUILD
  if (item == 0) pollMs = F3_SENSOR_POLL_OPEN_MS;
  else if (item == 1 && (f3HfCfg & 1)) pollMs = F3_SENSOR_POLL_OPEN_MS;
#endif
  if (now - f3LastPollMs < pollMs) return;
  f3LastPollMs = now;

  uint16_t raw = 0;
  if (!f3ReadSample(raw)) {
    f3SensorValid = f3HasFilt ? 1 : 0;
    if (f3HasFilt) f3LastFiltMm = (uint16_t)f3FiltMm;
#if F3_SENSOR_SERIAL
    f3SerialPrintHeight(f3LastRawMm, f3LastFiltMm, 0);
#endif
    return;
  }
  f3LastRawMm = raw;
  f3LastFiltMm = f3FilterMm(raw);
  f3SensorValid = 1;
#if F3_SENSOR_SERIAL
  f3SerialPrintHeight(f3LastRawMm, f3LastFiltMm, 1);
#endif
  f3TickDangerLed();
#endif
}

#if F3_HEIGHT_ENABLE
static void f3ClampHeightMm(uint16_t &mm) {
  if (mm < F3_HEIGHT_MM_MIN) mm = F3_HEIGHT_MM_MIN;
  if (mm > F3_HEIGHT_MM_MAX) mm = F3_HEIGHT_MM_MAX;
}

static uint8_t f3HeightMmValid(uint16_t mm) {
  if (mm == 0) return 1;
  if (mm < F3_HEIGHT_MM_MIN || mm > F3_HEIGHT_MM_MAX) return 0;
  return 1;
}

static void f3MarkHeightEepromValid() {
  EEPROM.update(F3_EEPROM_MAGIC_ADDR, F3_EEPROM_MAGIC);
}

void f3LoadHeightFromEeprom() {
  EEPROM.get(34, f3DangerMm);
  EEPROM.get(36, f3BaseMm);
  if (EEPROM.read(F3_EEPROM_MAGIC_ADDR) != F3_EEPROM_MAGIC) {
    if (!f3HeightMmValid(f3DangerMm)) f3DangerMm = 0;
    if (!f3HeightMmValid(f3BaseMm)) f3BaseMm = 0;
    EEPROM.put(34, f3DangerMm);
    EEPROM.put(36, f3BaseMm);
    f3MarkHeightEepromValid();
    return;
  }
  if (!f3HeightMmValid(f3DangerMm)) {
    f3DangerMm = 0;
    EEPROM.put(34, f3DangerMm);
  }
  if (!f3HeightMmValid(f3BaseMm)) {
    f3BaseMm = 0;
    EEPROM.put(36, f3BaseMm);
  }
  f3HfCfg = EEPROM.read(F3_EE_HEIGHT_ON) & 1;
}

static void f3SaveDangerMm(uint16_t mm) {
  if (mm == 0) {
    f3DangerMm = 0;
    EEPROM.put(34, f3DangerMm);
    f3MarkHeightEepromValid();
    return;
  }
  f3ClampHeightMm(mm);
  f3DangerMm = mm;
  EEPROM.put(34, f3DangerMm);
  uint16_t verify = 0;
  EEPROM.get(34, verify);
  if (verify != f3DangerMm) {
    EEPROM.put(34, f3DangerMm);
  }
  f3MarkHeightEepromValid();
}

static void f3SaveBaseMm(uint16_t mm) {
  if (mm == 0) {
    f3BaseMm = 0;
    EEPROM.put(36, f3BaseMm);
    f3MarkHeightEepromValid();
    return;
  }
  f3ClampHeightMm(mm);
  f3BaseMm = mm;
  EEPROM.put(36, f3BaseMm);
  uint16_t verify = 0;
  EEPROM.get(36, verify);
  if (verify != f3BaseMm) {
    EEPROM.put(36, f3BaseMm);
  }
  f3MarkHeightEepromValid();
}
#else
void f3LoadHeightFromEeprom() {
  f3DangerMm = 0;
  f3BaseMm = 0;
  f3HfCfg = 0;
}
#endif

static bool f3HeightCfgModeActive() {
#if !F3_HEIGHT_ENABLE
  return false;
#else
  return f3HeightCfgMode == 1;
#endif
}

#if F3_HEIGHT_ENABLE
/* 校验和保护的毫米解析：格式为 <数字位>S<2位校验和>，校验和=各数字之和 mod 100。
 * BLE 丢字符/串字符时，数值和校验和很难同时凑巧一致，可有效防止把损坏数据当真值写入。 */
static bool f3ParseHeightMm(const char *p, uint16_t &outMm) {
  if (!p || *p < '0' || *p > '9') return false;
  uint16_t mm = 0;
  uint16_t digitSum = 0;
  while (*p >= '0' && *p <= '9') {
    mm = (uint16_t)(mm * 10 + (*p - '0'));
    digitSum = (uint16_t)(digitSum + (uint16_t)(*p - '0'));
    if (mm > 3000) return false;
    p++;
  }
  if (*p != 'S') return false;
  p++;
  if (p[0] < '0' || p[0] > '9' || p[1] < '0' || p[1] > '9' || p[2] != 0) return false;
  uint16_t chk = (uint16_t)((p[0] - '0') * 10 + (p[1] - '0'));
  if (chk != (digitSum % 100)) return false;
  if (mm < 10) return false;
  outMm = mm;
#if F3_BLE_CMD_DEBUG
  Serial.print(F("[mm="));
  Serial.print(outMm);
  Serial.println(F("]"));
#endif
  return outMm >= F3_HEIGHT_MM_MIN && outMm <= F3_HEIGHT_MM_MAX;
}
#endif

#if F3_BLE_CMD_DEBUG
static void f3DbgLine(const __FlashStringHelper *tag) {
  Serial.print(F("[F3] "));
  Serial.println(tag);
}
static void f3DbgCmd(const __FlashStringHelper *tag, const char *cmd) {
  Serial.print(F("[F3] "));
  Serial.print(tag);
  Serial.print(F(" "));
  Serial.println(cmd);
}
static void f3DbgNum2(const __FlashStringHelper *tag, uint16_t a, uint16_t b) {
  Serial.print(F("[F3] "));
  Serial.print(tag);
  Serial.print(F(" "));
  Serial.print(a);
  Serial.print(F(" "));
  Serial.println(b);
}
#endif

static void f3HeightCfgModeLedApply() {
#if F3_MAX_BUILD
  f3WriteLeds(0, 1);
#endif
}

static void f3RequestStatusSend() {
  f3ForceStatusOnce = 1;
  lastStatusSend = 0;
}

#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
static void f3SaveHeightAndAck(uint8_t which, uint16_t mm) {
  f3CfgGraceUntil = millis() + 1500UL;
  foldAdjustActive = 0;
  f3CalPreviewActive = 0;
  if (which == 1) f3SaveDangerMm(mm);
  else f3SaveBaseMm(mm);
#if F3_BLE_CMD_DEBUG
  Serial.print(which == 1 ? F("OK A]") : F("OK B]"));
  Serial.println();
#endif
  f3HeightCfgModeLedApply();
  f3RequestStatusSend();
  sendStatusPacket();
#if F3_BLE_RX_SERIAL
  f3BleRxOkLine(which == 1 ? F("OK:DA") : F("OK:TB"), mm);
#endif
}

#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
static void f3LeaveHeightCfgForFlap() {
  if (!f3HeightCfgModeActive()) return;
  f3HeightCfgMode = 0;
  foldAdjustActive = 0;
  f3CalPreviewActive = 0;
  f3CfgGraceUntil = millis() + 1500UL;
  f3RequestStatusSend();
  statusLedUpdate();
}

static void f3PrepareUserServoAngleCmd() {
  f3LeaveHeightCfgForFlap();
  if (f3CalPreviewActive) {
    f3CalPreviewActive = 0;
    f3RequestStatusSend();
  }
}

static void f3EnterAngleAdjustCmd();
#endif

static bool f3TryShortHeightCmd(char *cmd) {
  if (cmd[0] == 'M' && cmd[1] == '1' && cmd[2] == 0) {
    f3HeightCfgMode = 1;
    f3CfgGraceUntil = 0;
    f3HeightCfgModeLedApply();
#if F3_BLE_RX_SERIAL
    f3BleRxSay(F("OK:CFG1"));
#endif
    return true;
  }
  if (cmd[0] == 'M' && cmd[1] == '0' && cmd[2] == 0) {
    f3HeightCfgMode = 0;
    foldAdjustActive = 0;
    f3CalPreviewActive = 0;
    f3CfgGraceUntil = millis() + 1500UL;
    f3RequestStatusSend();
    sendStatusPacket();
    f3TickDangerLed();
    statusLedUpdate();
#if F3_BLE_RX_SERIAL
    f3BleRxSay(F("OK:CFG0"));
#endif
    return true;
  }
  if ((cmd[0] == 'D' && cmd[1] == 'A' && cmd[2] >= '0' && cmd[2] <= '9')
      || (cmd[0] == 'T' && cmd[1] == 'B' && cmd[2] >= '0' && cmd[2] <= '9')) {
    if (!f3HeightCfgModeActive()) {
#if F3_BLE_RX_SERIAL
      f3BleRxSay(F("ER:CFG"));
#endif
      return false;
    }
    if (strchr(cmd, ':') || strchr(cmd, '|')) {
#if F3_BLE_RX_SERIAL
      f3BleRxSay(F("ER:CHR"));
#endif
      return false;
    }
#if F3_BLE_CMD_DEBUG
    Serial.print(F("["));
    Serial.print(cmd);
    Serial.print(F("->"));
#endif
    uint16_t mm = 0;
    if (!f3ParseHeightMm(cmd + 2, mm)) {
#if F3_BLE_RX_SERIAL
      f3BleRxSay(F("ER:SUM"));
#endif
      return false;
    }
    f3SaveHeightAndAck(cmd[0] == 'D' ? 1 : 2, mm);
    return true;
  }
  if (cmd[0] == 'F' && cmd[1] == '3' && cmd[2] == 'F' && cmd[4] == 0) {
    if (cmd[3] == 'R') {
      f3CalFoldRestore();
      return true;
    }
    if (cmd[3] == 'U') {
      f3CalPreviewStep(-1);
      return true;
    }
    if (cmd[3] == 'D') {
      f3CalPreviewStep(1);
      return true;
    }
  }
  return false;
}
#endif

void f3TickDangerLed() {
  static uint8_t lastDanger = 255;
  uint8_t nowDanger = f3DangerLedActive() ? 1 : 0;
  if (nowDanger != lastDanger) {
    lastDanger = nowDanger;
    statusLedUpdate();
    f3RequestStatusSend();
  }
}

#if F3_MAX_BUILD
static void f3WriteLeds(uint8_t redOn, uint8_t greenOn) {
  digitalWrite(8, redOn ? HIGH : LOW);
  digitalWrite(F3_PIN_LED_GREEN, greenOn ? HIGH : LOW);
}

void f3StatusLedUpdate() {
  // 关钥匙 10 秒倒计时：红绿指示灯全部关闭（故障闪灯暂停）
  if (isKeyOffCountdownActive()) {
    f3WriteLeds(0, 0);
    return;
  }
  // 堵转/遇阻重试：交给 tickFaultAlarm 闪灯，这里不改写
  if (faultIndicatorActive() || reboundAttempt > 0) return;
  if (item == 3) {
#if F3_HEIGHT_ENABLE
    if (!f3FoldCloseFault) f3WriteLeds(0, 0);
#else
    f3WriteLeds(0, 0);
#endif
    return;
  }
  // 过坑：车把红灯亮约 2s（禁止再折叠；收回仍可）
#if F3_IMU_ENABLE
  if (f3BumpFlapLocked()) {
    f3WriteLeds(1, 0);
    return;
  }
#endif
  // 折叠角调整 / 测高标定：绿灯常亮（优先于折叠超时闪灯、ACK 闪烁）
  if (foldAdjustActive || f3HeightCfgModeActive()) {
    f3WriteLeds(0, 1);
    return;
  }
#if F3_HEIGHT_ENABLE
  if (f3FoldCloseFault) return;
#endif
  if (pin2KeyOffStable()) {
    if (accRetractOn != 1) {
      f3WriteLeds(0, 0);
      return;
    }
  }
  if (item == 1) {
#if F3_HEIGHT_ENABLE
    if (f3FoldCloseFault) return;
#endif
    f3WriteLeds(0, 1);
    return;
  }
  if (f3DangerLedActive()) {
    f3WriteLeds(1, 0);
    return;
  }
  f3WriteLeds(0, 0);
}
#endif

#define RX_BUF_SIZE 48
#define RX_CMD_MAX 24

volatile int item;
volatile int bianlaing;
volatile int fullOpenAngle;
volatile int customAngle;
volatile int item4;
volatile int accRetractOn;
volatile unsigned long lastReceiveTime;
volatile unsigned long timeout;
volatile int y;
volatile int selfCheckOn;
volatile int powerOnFlip;
volatile int stuckCount;
volatile unsigned long openStartMs;
volatile unsigned long reboundWaitUntil;
volatile unsigned long lastStatusSend;
volatile unsigned long selfCheckStartMs;
volatile int reboundAttempt;
volatile uint8_t reboundFaultLatched;
volatile uint8_t pendingFaultReport;
volatile uint8_t stealthActive;
volatile uint8_t userServoSpeed;
volatile unsigned long stealthWindowStart;
volatile unsigned long pin9HoldUntil;
volatile uint8_t pin9HoldExpired;
volatile uint8_t pendingKeyOffFold;
volatile uint8_t keyOffRetractBusy;
volatile uint16_t stealthElapsedMin;
volatile unsigned long stealthMinuteMark;
volatile uint8_t stealthBtnExitOn;
volatile uint8_t stallDetectOn;
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
// Pin5 按下后固定 10 秒检测窗（再次按 Pin5 打断并重开）
const unsigned long BTN_DETECT_WINDOW_MS = 10000UL;
const unsigned long BTN_DETECT_SAMPLE_MS = 5UL;
const int BTN_STALL_A0_THR = 870; // 开机自检等仍用固定门槛
const int BTN_STALL_HITS_NEED = 2;
// 运行中碰胎/堵转：具体数值可 BLE 下发；SS0/1/2 仅写入预设
static uint8_t f3StallSens = 1; // 最近选用的预设档（自定义后仍保留）
static int16_t f3StallOpenThr = 845;
static int16_t f3StallCloseThr = 870;
static uint8_t f3StallHitsOpen = 3;
static uint8_t f3StallHitsClose = 3;
const uint8_t BOOT_STALL_HITS_NEED = 3;
const unsigned long MOTOR_MIN_RUN_BEFORE_STALL_MS = 250UL;
const unsigned long BOOT_STALL_CYCLE_MS = 2000UL; // 堵转重试：item4-2 → item4-10 一轮至少 2s
const unsigned long REBOUND_RETRY_WAIT_MS = 800UL;
const unsigned long STALL_ARM_MS = 200UL;
// 灭→亮开窗后前 0.4s 堵转：视为未解锁，走开机同款 item4-2 ↔ 折叠位解锁重试
const unsigned long EARLY_OPEN_LOCK_STALL_MS = 400UL;
const int AUTO_LEVEL_FOLD_THR = 900;
const int AUTO_LEVEL_OPEN_THR = 900;
const uint8_t STALL_REBOUND_MAX = 2;
// 开机后数秒内禁止堵转反弹/自检故障，避免误触发来回抖
const unsigned long BOOT_SETTLE_MS = 6000UL;
// 上电后先等电源/驱动稳定，指示灯开始闪后再发开机 PWM 目标角
const unsigned long BOOT_PWR_SETTLE_MS = 800UL;
const unsigned long BOOT_LED_LEAD_ON_MS = 400UL;
const unsigned int BOOT_FOLD_SLOW_HALF_MS = 500;
// 故障灯：开机未到位/未解锁=红闪；卡住堵转=红-绿互斥交替
const unsigned long FAULT_ERR1_BLINK_MS = 180UL;
const unsigned long FAULT_ERR2_BLINK_MS = 280UL;
// 到位后保持 PWM 再 detach，避免数字舵机收口抽搐
const unsigned long SERVO_PWM_HOLD_MS = 150UL;

const char CMD_OPEN[] PROGMEM = "\xE6\x89\x93\xE5\xBC\x80";
const char CMD_CLOSE[] PROGMEM = "\xE5\x85\xB3\xE9\x97\xAD";
const char CMD_AUTO_LEVEL[] PROGMEM = "\xE8\x87\xAA\xE5\x8A\xA8\xE8\xB0\x83\xE5\xB9\xB3";
const char CMD_ACC_ON[] PROGMEM = "\xE6\x89\x93\xE5\xBC\x80\xE6\x94\xB6\xE5\x9B\x9E";
const char CMD_ACC_OFF[] PROGMEM = "\xE5\x85\xB3\xE9\x97\xAD\xE6\x94\xB6\xE5\x9B\x9E";
const char CMD_CHECK_ON[] PROGMEM = "\xE5\xBC\x80\xE5\x90\xAF\xE8\x87\xAA\xE6\xA3\x80";
const char CMD_CHECK_OFF[] PROGMEM = "\xE5\x85\xB3\xE9\x97\xAD\xE8\x87\xAA\xE6\xA3\x80";
const char CMD_STALL_CHK_ON[] PROGMEM = "\xE5\xBC\x80\xE5\x90\xAF\xE5\xA0\xB5\xE8\xBD\xAC\xE6\xA3\x80\xE6\xB5\x8B";
const char CMD_STALL_CHK_OFF[] PROGMEM = "\xE5\x85\xB3\xE9\x97\xAD\xE5\xA0\xB5\xE8\xBD\xAC\xE6\xA3\x80\xE6\xB5\x8B";
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
const char CMD_SPEED[] PROGMEM = "\xE8\xB0\x83\xE9\x80\x9F";
const uint8_t SERVO_SPEED_MIN_PCT = 10;
const uint8_t SERVO_SPEED_MAX_PCT = 100;
const uint8_t SERVO_SPEED_DEFAULT_PCT = 100;

void handleBleCommand(char *cmd);

void foldToRetract();
void triggerStallRebound(unsigned long detectElapsed = 0);
void requestFlapOpen(bool stallRetry = false);
void requestFlapClose(bool userRequest = true);
bool canUserFlapControl();
void updatePin9Power();
void armPin9KeyOffHold();
void tickStealthKeyWindow();
void watchdogFeed();
void watchdogBegin();
void requestSoftwareReset();
void bootMoveToFold();
bool isKeyOffCountdownActive();
void btn5ServiceTick();
void btn5Init();
void btn5NoteStealthExited();
void statusLedUpdate();
void blinkPin8(uint8_t times, int onMs, int offMs);
void blinkPin8Fault(uint8_t times, int onMs, int offMs);
void enterStealthMode();
void exitStealthMode();
void clearOpenMonitor();
void tickFaultAlarm();
void enterFaultLockState();
bool isSelfCheckFaultLatched();
bool btnDetectWindowActive();
void restartBtnDetectWindow();
void finishBtnDetectWindow();
void savePendingFaultReport(uint8_t errType);
void clearBtnDetectSamples();

#if F2_KEY_SERIAL_DEBUG
static void keyDbgLine(const __FlashStringHelper *tag);
static void keyDbgKv(const __FlashStringHelper *tag, int a, int b = -9999);
#define KDBG_L(tag) keyDbgLine(F(tag))
#define KDBG_KV(tag, a, b) keyDbgKv(F(tag), (a), (b))
#else
#define KDBG_L(tag) ((void)0)
#define KDBG_KV(tag, a, b) ((void)0)
#endif

SoftwareSerial mySerial(6, 7);

#if F3_BLE_RX_SERIAL
static void f3BleRxEchoCmd(const char *cmd) {
  if (!cmd || !cmd[0]) return;
  mySerial.print(F("RX:"));
  mySerial.println(cmd);
}
static void f3BleRxOkLine(const __FlashStringHelper *tag, uint16_t mm) {
  mySerial.print(tag);
  mySerial.println(mm);
}
static void f3BleRxSay(const __FlashStringHelper *line) {
  mySerial.println(line);
}
#endif

char rxBuf[RX_BUF_SIZE];
uint8_t rxLen = 0;
int lastWrittenAngle = -1;
int servoTrackItem = -1;
int servoTrackAngle = -1;
uint8_t foldHoldActive = 0;
uint8_t openEaseActive = 0;
uint8_t foldAdjustActive = 0;
uint8_t servoPwmOff = 1;
uint8_t forceServoMove = 0;
unsigned long servoPwmHoldUntil = 0;
uint8_t autoLevelBusy = 0;
static uint8_t reboundRetryOpen = 0;
static uint8_t reboundRetryClose = 0;
// 收回重试正在执行：foldToRetract 勿清堵转次数，否则收回方向永远重试不到上限
static uint8_t stallRetryClosing = 0;
static uint8_t keyOnRstMk __attribute__((section(".noinit")));

int lastMotorA0 = -1;
unsigned long lastMotorSampleMs = 0;
unsigned long bootSettleUntil = 0;
static uint8_t bootStallEn = 0;
#define bootStallFinish() do { if (bootStallEn != 2) bootStallEn = 0; } while (0)
unsigned long btnDetectStartMs = 0;
unsigned long flapSettleUntil = 0;
static unsigned long flapEaseNextMs = 0;
static unsigned long stallIgnoreUntil = 0;

#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
static bool f3FoldCloseWatchActive() {
  return item == 1 && (f3HfCfg & 1);
}

/* 翻开 8cm 监测：仅缓动/settle 中暂停；forceServoMove 标志可能常亮不能挡监测 */
static bool f3FoldOpenWatchMotionBusy() {
  if (openEaseActive) return true;
  if (flapSettleUntil != 0 && (long)(millis() - flapSettleUntil) < 0) return true;
  return false;
}

static bool f3ServoMotionBusy() {
  if (openEaseActive || forceServoMove) return true;
  if (flapSettleUntil != 0 && (long)(millis() - flapSettleUntil) < 0) return true;
  return false;
}
#endif

bool tickMotionA0Realtime(bool forceSample);
#if F2_MOTION_A0_DEBUG
void debugPrintMotionA0(int a0);
#else
#define debugPrintMotionA0(a) ((void)0)
#endif

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
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
  pinMode(F3_SERVO_PIN, OUTPUT);
  digitalWrite(F3_SERVO_PIN, HIGH);
#endif
}

void servoCancelPwmHold() {
  servoPwmHoldUntil = 0;
}

void servoSchedulePwmRelease() {
  if (servoPwmOff || item == 3) return;
  servoPwmHoldUntil = millis() + SERVO_PWM_HOLD_MS;
}

// 运动结束：保持目标角一小段时间再 detach，避免重复 write + 立刻 detach 抽搐
void servoFinalizePosition(int angle) {
  if (angle < 0) angle = 0;
  if (angle > 180) angle = 180;
  lastWrittenAngle = angle;
  servoTrackItem = item;
  servoTrackAngle = angle;
  if (servoPwmOff) return;
  int live = servo.read();
  if (live < 0 || live > 180 || abs(live - angle) > 2) {
#if F2_VARSERVO
    servo.write(angle);
    servo.stop();
#else
    servo.write(angle);
#endif
  }
  servoPwmHoldUntil = millis() + SERVO_PWM_HOLD_MS;
}

void servoPrepareMove() {
  if (item == 3) return;
  servoCancelPwmHold();
  servoMotionOn();
  if (servoPwmOff) {
    servo.attach(F3_SERVO_PIN);
    servoPwmOff = 0;
    if (lastWrittenAngle >= 0 && lastWrittenAngle <= 180) {
      servo.write(lastWrittenAngle);
    }
  }
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
  int c = lastWrittenAngle;
  if (c < 0 || userServoSpeed >= 100 || abs(c - angle) <= 2) {
    openEaseActive = 0;
    lastWrittenAngle = angle;
    servo.write(angle);
    return;
  }
  if ((long)(millis() - flapEaseNextMs) < 0) return;
  c += (angle > c) ? 1 : -1;
  lastWrittenAngle = c;
  servo.write(c);
  openEaseActive = (c != angle);
  flapEaseNextMs = millis() + (120UL - userServoSpeed);
#endif
}

#if F2_VARSERVO
uint8_t getUserServoSpeedByte() {
  uint8_t p = userServoSpeed;
  if (p < SERVO_SPEED_MIN_PCT) p = SERVO_SPEED_MIN_PCT;
  if (p > SERVO_SPEED_MAX_PCT) p = SERVO_SPEED_MAX_PCT;
  return (uint8_t)map(p, SERVO_SPEED_MIN_PCT, SERVO_SPEED_MAX_PCT, 35, 255);
}
#endif

void updateServoOutput();
int readServoAngle();
void selfCheckTick();
static int readServoAngleLive();

static unsigned long flapMoveSettleMs(int fromAngle, int toAngle) {
  unsigned long ms = (unsigned long)abs(toAngle - fromAngle) * 28UL + 400UL;
  if (ms < 400UL) ms = 400UL;
  if (ms > 2500UL) ms = 2500UL;
  return ms;
}

void tickFlapServoHold(int target) {
  if (item != 0 && item != 1) return;

  if (!forceServoMove && servoMoveCommitted(target) && servoPwmOff && flapSettleUntil == 0) {
    if (item == 0) {
      foldHoldActive = 1;
      // 不在此处 finishBtnDetectWindow：收回末段仍须继续碰胎检测（与打开到位一致）
      if (!reboundAttempt) {
        reboundWaitUntil = 0;
      }
    } else if (item == 1 && target == bianlaing && reboundAttempt > 0) {
      reboundAttempt = 0;
      reboundRetryOpen = 0;
    }
    return;
  }

  if (forceServoMove || servoTrackItem != item || servoTrackAngle != target) {
    forceServoMove = 0;
    servoPrepareMove();
    int start = readServoAngle();
    if (start < 0 || start > 180) {
      if (lastWrittenAngle >= 0 && lastWrittenAngle <= 180) start = lastWrittenAngle;
      else start = (target == bianlaing) ? item4 : target;
    }
    if (start >= 0 && start <= 180) lastWrittenAngle = start;
    openEaseActive = (userServoSpeed < 100 && abs(start - target) > 2);
    if (openEaseActive) flapEaseNextMs = millis();
    else servoWriteEaseStep(target, 0);
    servoTrackItem = item;
    servoTrackAngle = target;
    flapSettleUntil = millis() + flapMoveSettleMs(start, target);
    foldHoldActive = 0;
    return;
  }

  if (flapSettleUntil != 0 && (long)(millis() - flapSettleUntil) < 0) {
    if (servoTrackItem != item || servoTrackAngle != target) {
      flapSettleUntil = 0;
    } else {
      if (stallCheckActive() && btnDetectWindowActive()) {
        tickMotionA0Realtime(true);
      }
      if (!servoPwmOff) {
        int live = readServoAngleLive();
        if (live >= 0 && abs(live - target) <= 3) {
          flapSettleUntil = 0;
        } else {
          return;
        }
      } else {
        flapSettleUntil = 0;
      }
    }
  }

  flapSettleUntil = 0;
  if (servoPwmOff) {
    if (lastWrittenAngle >= 0 && abs(lastWrittenAngle - target) <= 3) {
      servoTrackItem = item;
      servoTrackAngle = target;
      if (item == 0) {
        foldHoldActive = 1;
      }
    } else {
      servoTrackAngle = -1;
      forceServoMove = 1;
    }
    return;
  }
  if (servoPwmHoldUntil != 0 && (long)(millis() - servoPwmHoldUntil) < 0) {
    if (item == 0) foldHoldActive = 1;
    return;
  }

  lastWrittenAngle = target;
  servoFinalizePosition(target);
  if (item == 0) {
    foldHoldActive = 1;
    if (!reboundAttempt) {
      reboundWaitUntil = 0;
    }
  }
  if (selfCheckOn == 1 && !reboundFaultLatched && !reboundAttempt) lastStatusSend = 0;
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
    watchdogFeed();
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
  while (len > 0 && (s[len - 1] == '\r' || s[len - 1] == '\n' || s[len - 1] == ' ' || s[len - 1] == '#')) {
    s[--len] = 0;
  }
  uint8_t start = 0;
  while (s[start] == ' ' || s[start] == '\r' || s[start] == '\n') start++;
  if (start > 0) memmove(s, s + start, strlen(s + start) + 1);
}

/* 收包窗口内或缓冲非空：禁止 BLE 状态 TX，避免 SoftwareSerial 发 ANG: 冲掉中文命令 */
static bool bleSerialRxBusy() {
  if (rxLen > 0) return true;
  if (lastReceiveTime > 0 && millis() - lastReceiveTime < timeout + 50UL) return true;
  return false;
}

#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
static void f3BleDispatchCmd(char *cmd) {
  if (f3HeightCfgModeActive()) {
    if (cmdIsP(cmd, CMD_ADJ_FOLD) || cmdIsP(cmd, CMD_ADJ_BIG) || cmdIsP(cmd, CMD_ADJ_SMALL)) {
      handleBleCommand(cmd);
      return;
    }
  }
  handleBleCommand(cmd);
}
#else
static void f3BleDispatchCmd(char *cmd) {
  handleBleCommand(cmd);
}
#endif

static void dispatchBleRxCmd() {
  trimBuf(rxBuf);
  if (!rxBuf[0]) return;
  uint8_t flapRx = cmdIsP(rxBuf, CMD_OPEN) || cmdIsP(rxBuf, CMD_CLOSE);
  f3BleDispatchCmd(rxBuf);
  if (flapRx) lastReceiveTime = millis();
}

void pollBleSerial() {
  uint8_t rxBudget = 40;
  while (mySerial.available() && rxBudget--) {
    wdt_reset();
    int b = mySerial.read();
    if (b < 0) break;
    char c = (char)(b & 0xFF);
#if F3_BLE_RX_USB_DEBUG
    Serial.write((uint8_t)c);
#endif
    /* 勿用 c<0x20：UTF-8 中文高字节在 signed char 下为负数，会被误丢弃 */
    if (c == '\r' || c == '\n') {
      if (rxLen > 0) lastReceiveTime = 0;
      continue;
    }
    if (c == '#') {
      if (rxLen < RX_BUF_SIZE - 1) rxBuf[rxLen++] = c;
      rxBuf[rxLen] = 0;
      rxLen = 0;
      trimBuf(rxBuf);
      if (rxBuf[0] != 0) {
#if F3_BLE_RX_SERIAL
        f3BleRxEchoCmd(rxBuf);
#elif F3_BLE_CMD_DEBUG
        f3DbgCmd(F("BLE RX"), rxBuf);
#endif
        dispatchBleRxCmd();
      }
      rxBuf[0] = 0;
      lastReceiveTime = 0;
#if F3_BLE_RX_USB_DEBUG
      Serial.println();
#endif
      continue;
    }
    if (rxLen >= RX_CMD_MAX) {
      rxLen = 0;
      rxBuf[0] = 0;
    }
    if (rxLen < RX_BUF_SIZE - 1) rxBuf[rxLen++] = c;
    lastReceiveTime = millis();
  }
  if (rxLen > 0 && millis() - lastReceiveTime > timeout) {
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
    if (f3HeightCfgModeActive()) {
      /* 小程序 DA/TB 逐字间隔 280ms；勿在 100ms 超时拆成单字符命令，只等 # */
      if (rxBuf[0] == 'D' || rxBuf[0] == 'T' || rxBuf[0] == 'M') return;
    }
    if (f3HeightCfgModeActive()) {
      rxBuf[rxLen] = 0;
      trimBuf(rxBuf);
      if (rxBuf[0] != 0) {
#if F3_BLE_RX_SERIAL
        f3BleRxEchoCmd(rxBuf);
#endif
        dispatchBleRxCmd();
      }
      rxLen = 0;
      rxBuf[0] = 0;
#if F3_BLE_RX_USB_DEBUG
      Serial.println();
#endif
      return;
    }
#endif
    rxBuf[rxLen] = 0;
    rxLen = 0;
    trimBuf(rxBuf);
    if (rxBuf[0] == 0) return;
#if F3_BLE_RX_SERIAL
    f3BleRxEchoCmd(rxBuf);
#elif F3_BLE_CMD_DEBUG
    f3DbgCmd(F("BLE RX timeout"), rxBuf);
#endif
    dispatchBleRxCmd();
    rxBuf[0] = 0;
#if F3_BLE_RX_USB_DEBUG
    Serial.println();
#endif
  }
}

bool tickMotionA0Realtime(bool forceSample);
static int readServoAngleLive();

bool flapOpenMoving() {
  if (item != 1) return false;
  return openEaseActive || flapSettleUntil != 0 || !servoAtAngle(bianlaing);
}

bool flapCloseMoving() {
  if (item != 0) return false;
  if (openEaseActive || flapSettleUntil != 0) return true;
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
  if ((f3HfCfg & 1) && f3SensorOk && (f3SensorValid || f3HasFilt) && f3TofSaysFoldNear()) return false;
#endif
#if F3_MAX_BUILD
  int foldT = foldAdjustActive ? (int)item4 : f3FoldMotionTarget();
  if (!openEaseActive && flapSettleUntil == 0) {
    int live = readServoAngleLive();
    if (live >= 0 && abs(live - foldT) <= 3) return false;
  }
  return !servoAtAngle(foldT);
#else
  return !servoAtAngle(item4);
#endif
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

bool f3HeightMonitorActive() {
  if (f3HeightCfgModeActive()) {
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
    if (f3CalPreviewActive) return false;
#endif
    return true;
  }
  if (!(f3HfCfg & 1)) return false;
  if (autoLevelBusy) return false;
  if (foldAdjustActive) return false;
  if (item == 0) {
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
    if (f3ServoMotionBusy()) return false;
#endif
    return true;
  }
  if (item == 1) {
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
    return true;
#endif
    return false;
  }
  return false;
}

// F3 MAX 只保留堵转检测；未写入 EEPROM 时回退 selfCheckOn。
bool stallCheckActive() {
  if (stallDetectOn == 0 || stallDetectOn == 1) return stallDetectOn == 1;
  return selfCheckOn == 1;
}

bool motionCheckActive() {
  if (foldAdjustActive) return false;
  if (keyOffRetractBusy) return false;
  // 收回到位后 foldHold 仍允许检测窗内采样（碰胎常在末段）
  if (foldHoldActive && servoPwmOff && btnDetectStartMs == 0) return false;
  if (!stallCheckActive()) return false;
  // 调速非 100% 时为缓动步进，A0 特征与全速不同，不做堵转检测
  if (userServoSpeed < SERVO_SPEED_MAX_PCT) return false;
  return true;
}

static bool keyOffRetractEnabled() {
#if F3_MAX_BUILD
  if (f3PowerOffLockOn) return true;
#endif
  return accRetractOn == 1;
}

// 是否允许本次「关钥匙收回」：冷启动钥匙一直关且从未翻开 → 不触发
static bool keyOffRetractEligible() {
  if (pin2SeenHighSinceBoot) return true;
  if (item == 1) return true;
  return false;
}

#if F3_MAX_BUILD
static int f3FoldUserTarget() {
  int t = (int)item4 - (int)F3_FOLD_USER_DELTA;
  return t < 0 ? 0 : t;
}

static int f3KeyOffFoldTarget() {
  return f3PowerOffLockOn ? (int)item4 : f3FoldUserTarget();
}

static int f3FoldMotionTarget() {
  // 断电锁死开启且钥匙已关：全程都以 item4 为目标（含本来已在 item4-10）
  if (f3PowerOffLockOn && pin2KeyOffStable()) return (int)item4;
  if (keyOffRetractBusy) return f3KeyOffFoldTarget();
  return f3FoldUserTarget();
}
#endif

static int readServoAngleLive();

#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
static bool f3TofSaysFoldNear() {
  if (!f3SensorOk) return false;
  if (!f3SensorValid && !f3HasFilt) return false;
  uint16_t mm = f3SensorValid ? f3LastFiltMm : (uint16_t)f3FiltMm;
  if (mm == 0) return false;
  return mm < F3_FOLD_NEAR_MM;
}

/* 翻开测距异常：无读数/超量程/≥8cm 均视为未到位 */
static bool f3TofSaysFoldOpenFault() {
  if (!f3SensorOk) return true;
  if (!f3SensorValid) return true;
  if (f3LastFiltMm == 0) return true;
  return f3LastFiltMm >= F3_FOLD_NEAR_MM;
}

static void f3ClearFoldCloseWatch() {
  f3FoldCloseWatchMs = 0;
  if (f3FoldCloseFault) {
    f3FoldCloseFault = 0;
    statusLedUpdate();
  }
}

static void f3ArmFoldCloseWatch() {
  f3FoldCloseWatchMs = 0;
  if (f3FoldCloseFault) {
    f3FoldCloseFault = 0;
    statusLedUpdate();
  }
}

static void f3TickFoldCloseWatch() {
  if (foldAdjustActive) return;
  if (!(f3HfCfg & 1)) {
    f3ClearFoldCloseWatch();
    return;
  }
  // 堵转优先：不再跑折叠 TOF 报警
  if (reboundFaultLatched || pendingFaultReport == 2) {
    f3FoldCloseWatchMs = 0;
    if (f3FoldCloseFault) {
      f3FoldCloseFault = 0;
    }
    return;
  }
  if (item != 1) {
    f3FoldCloseWatchMs = 0;
    return;
  }
  /* 翻开缓动/settle 中暂停采样；计时不清零（settle 抖动否则永远凑不满 8s） */
  if (f3FoldOpenWatchMotionBusy()) {
    return;
  }
  {
    uint16_t raw = 0;
    if (f3ReadSample(raw)) {
      f3LastRawMm = raw;
      f3LastFiltMm = f3FilterMm(raw);
      f3HasFilt = 1;
      f3SensorValid = 1;
    } else {
      f3SensorValid = 0;
    }
  }
  if (!f3TofSaysFoldOpenFault()) {
    f3FoldCloseWatchMs = 0;
    if (f3FoldCloseFault) {
      f3FoldCloseFault = 0;
      statusLedUpdate();
    }
    return;
  }
  if (f3FoldCloseWatchMs == 0) {
    f3FoldCloseWatchMs = millis();
    return;
  }
  if (millis() - f3FoldCloseWatchMs >= F3_FOLD_CLOSE_TIMEOUT_MS) {
    if (!f3FoldCloseFault) {
      f3FoldCloseFault = 1;
      f3ForceStatusOnce = 1;
      lastStatusSend = 0;
      tickFaultAlarm();
    }
  }
}
#endif

#if !F3_MAX_BUILD
static bool flapPhysicallyAtFold() {
  int live = readServoAngleLive();
  if (live < 0 || live > 180) return false;
  return abs(live - item4) <= 2;
}
#endif

// 关机位置=收回且 2 号已关：收牌全程不做堵转/电机检测
static void armKeyOffRetractSuppress() {
  if (!keyOffRetractEnabled()) return;
  if (digitalRead(2) != LOW) return;
  keyOffRetractBusy = 1;
  clearOpenMonitor();
  reboundWaitUntil = 0;
  reboundAttempt = 0;
  stuckCount = 0;
}

static void tickKeyOffRetractDone() {
  if (!keyOffRetractBusy) return;
  if (digitalRead(2) == HIGH || !keyOffRetractEnabled()) {
    keyOffRetractBusy = 0;
    return;
  }
  if (item == 0 && !openEaseActive) {
    if (abs(readServoAngleLive() - f3KeyOffFoldTarget()) <= 2) {
      keyOffRetractBusy = 0;
    }
  }
}

// Pin5 检测窗：按下起 10 秒内持续采样；再次按 Pin5 由 restartBtnDetectWindow 打断重开
// 注意：不依赖 foldHoldActive，否则收回到位瞬间会把窗掐死（亮→灭无检测）
bool btnDetectWindowActive() {
  if (keyOffRetractBusy || foldAdjustActive) return false;
  if (!stallCheckActive()) return false;
  if (userServoSpeed < SERVO_SPEED_MAX_PCT) return false;
  if (btnDetectStartMs == 0) return false;
  return (millis() - btnDetectStartMs) <= BTN_DETECT_WINDOW_MS;
}

// 与旧版一致：单次 analogRead（burst+delay 会卡住舵机 PWM，读到的全是 1023）
int readMotorA0() {
  (void)analogRead(A0);
  return analogRead(A0);
}

void clearBtnDetectSamples() {
  stuckCount = 0;
  lastMotorSampleMs = 0;
  lastMotorA0 = -1;
}

void restartBtnDetectWindow() {
  btnDetectStartMs = millis();
  openStartMs = btnDetectStartMs;
  selfCheckStartMs = btnDetectStartMs;
  clearBtnDetectSamples();
}

// 用户中途反向：短时不计堵转，避免 A0 尖峰误锁死
static void armStallGraceAfterUserReverse() {
  clearBtnDetectSamples();
  reboundAttempt = 0;
  reboundWaitUntil = 0;
  reboundRetryOpen = 0;
  reboundRetryClose = 0;
  stallIgnoreUntil = millis() + 800UL;
}

// 亮→灭（收回）反向宽限略短，仍尽快进入碰胎检测
static void armStallGraceCloseReverse() {
  clearBtnDetectSamples();
  reboundWaitUntil = 0;
  reboundRetryOpen = 0;
  reboundRetryClose = 0;
  stallIgnoreUntil = millis() + 450UL;
}

// 运行中堵转门槛：用可下发数值（默认=标准档）
static int f3StallThrNow() {
  return (item == 0) ? (int)f3StallCloseThr : (int)f3StallOpenThr;
}

static int f3StallHitsNow() {
  return (item == 0) ? (int)f3StallHitsClose : (int)f3StallHitsOpen;
}

static void f3ApplyStallPreset(uint8_t s) {
  if (s > 2) s = 1;
  f3StallSens = s;
  f3StallOpenThr = 800 + (int16_t)s * 45; // 800/845/890
  f3StallCloseThr = (s == 0) ? 825 : ((s == 1) ? 870 : 910);
  f3StallHitsOpen = (uint8_t)(4 - s);     // 4/3/2
  f3StallHitsClose = (s == 2) ? 2 : 3;
}

void finishBtnDetectWindow() {
  if (btnDetectStartMs == 0) return;
  btnDetectStartMs = 0;
  openStartMs = 0;
  clearBtnDetectSamples();
  if (item == 0 && reboundWaitUntil == 0) {
    reboundAttempt = 0;
  }
}

// 打开/折叠角度微调：仅动舵机，不做堵转/测距/故障上报
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
static void f3EnterAngleAdjustCmd() {
  f3PrepareUserServoAngleCmd();
  foldAdjustActive = 1;
  finishBtnDetectWindow();
  armStallGraceAfterUserReverse();
}

static void f3BeginOpenAngleBleCmd() {
  f3EnterAngleAdjustCmd();
  if (item != 3) {
    item = 1;
    foldHoldActive = 0;
    statusLedUpdate();
  }
}

static void f3WriteBianlaingEeprom() {
  invalidateServoHold();
  writeServo(bianlaing);
  EEPROM.put(1, bianlaing);
  lastStatusSend = 0;
}
#endif

// Pin5 十秒窗：只做堵转检测。
bool tickMotionA0Realtime(bool forceSample) {
  if (keyOffRetractBusy) return false;
  if (inBootSettle() || autoLevelBusy || reboundFaultLatched) return false;
  if (!motionCheckActive()) return false;
  if (item != 0 && item != 1) return false;
  if (btnDetectStartMs == 0) return false;

  unsigned long now = millis();
  if ((long)(now - stallIgnoreUntil) < 0) return false;

  unsigned long elapsed = now - btnDetectStartMs;

  if (elapsed > BTN_DETECT_WINDOW_MS) {
    finishBtnDetectWindow();
    return false;
  }

  // 检测窗内持续采样；打开须能在 0.4s 内判到未解锁，故开检更早
  unsigned long armMs = STALL_ARM_MS;
  unsigned long runMs = MOTOR_MIN_RUN_BEFORE_STALL_MS;
  if (item == 1) {
    armMs = 80UL;
    runMs = 120UL;
  } else if (item == 0) {
    armMs = 160UL;
    runMs = 220UL;
  }
  if (elapsed < armMs) return false;

  if (!forceSample && now - lastMotorSampleMs < BTN_DETECT_SAMPLE_MS) return false;
  lastMotorSampleMs = now;

  int a0 = readMotorA0();
  lastMotorA0 = a0;

  if (!stallCheckActive()) {
    debugPrintMotionA0(a0);
    return false;
  }

  if (elapsed < armMs + runMs) {
    debugPrintMotionA0(a0);
    return false;
  }

  int stallThr = f3StallThrNow();
  int hitsNeed = f3StallHitsNow();

  if (a0 < stallThr) {
    stuckCount++;
  }
  // 累计满 hitsNeed 即判堵转（不因 A0 回升清零）

  if (stuckCount >= hitsNeed) {
    // 先算开窗时长再清零，供「刚打开即堵=未解锁」判断使用
    unsigned long detectElapsed = now - btnDetectStartMs;
    btnDetectStartMs = 0;
    openStartMs = 0;
    stuckCount = 0;
#if F2_SERIAL_DEBUG
    Serial.print(F("STALL a0="));
    Serial.println(a0);
#endif
    triggerStallRebound(detectElapsed);
    return true;
  }

  debugPrintMotionA0(a0);
  return false;
}

bool inBootSettle() {
  return bootSettleUntil != 0 && millis() < bootSettleUntil;
}

void delayWithBlePoll(unsigned long ms) {
  unsigned long endAt = millis() + ms;
  unsigned long lastStatusInDelay = 0;
  while ((long)(millis() - endAt) < 0) {
    pollBleSerial();
    unsigned long now = millis();
    if (now - lastStatusInDelay >= 200UL && !bleSerialRxBusy()) {
      lastStatusInDelay = now;
      sendStatusPacket();
    }
    tickStealthKeyWindow();
    watchdogFeed();
    updatePin9Power();
    if (reboundFaultLatched) tickFaultAlarm();
  }
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
  return STEALTH_ENTRY_WINDOW_MS;
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
  keyOnRstMk = 0xA5;
  if (item == 3 && stealthActive) keyOnRstMk = 0xA7;
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

// 关钥匙后前 10 秒：可长按进隐蔽（F3 无延时断电分钟）
bool canUserFlapControl() {
  if (isSelfCheckFaultLatched()) return false;
  if (item == 3 || autoLevelBusy) return false;
  return digitalRead(2) == HIGH;
}

// 长按进隐蔽：钥匙开随时可进；关钥匙后仅前 10 秒可进；延时断电阶段禁止
bool canEnterStealthViaBtn5() {
  if (isSelfCheckFaultLatched()) return false;
  if (item == 3 || autoLevelBusy) return false;
  if (digitalRead(2) == HIGH) return true;
  return isStealthEntryWindow();
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
  if (openEaseActive || flapMotionMoving()) return;
  if (servoPwmHoldUntil != 0 && (long)(millis() - servoPwmHoldUntil) < 0) return;
  if (!servoPwmOff) {
    servoStopHold();
  }
}

// 关钥匙沿：延时断电内 ACC 接回 → 软复位走平时开机设置
void tickStealthKeyWindow() {
  bool pin2High = digitalRead(2) == HIGH;

  // 隐蔽模式：Pin2 关钥匙/接钥匙均不干预
  if (item == 3) {
    if (!pin2EdgeInit) {
      lastPin2High = pin2High;
      pin2EdgeInit = 1;
    } else {
      lastPin2High = pin2High;
    }
    return;
  }

#if F3_MAX_BUILD
  if (stealthEntryBusy) return;
#endif

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
      KDBG_KV("KEY_FALL", item, accRetractOn);
      keyOffFoldHandled = false;
      armPin9KeyOffHold();
      updatePin9Power();
    }

    // 收牌须 2 号稳定关断后再动舵机；冷启动钥匙一直关着不算一次「关钥匙」
    if (pin2KeyOffStable() && !keyOffFoldHandled && keyOffRetractEligible()) {
      keyOffFoldHandled = true;
      if (!isSelfCheckFaultLatched()) {
        if (keyOffRetractEnabled() && item != 3 && !autoLevelBusy
#if F3_MAX_BUILD
            && !stealthEntryBusy
#endif
            ) {
          if (item != 0) {
            KDBG_L("KEY_OFF_RETRACT");
            requestFlapClose(false);
          }
#if F3_MAX_BUILD
          else if (f3PowerOffLockOn && abs(readServoAngleLive() - (int)item4) > 2) {
            // 已在日常折叠(item4-10)：断电锁死再推到锁止位 item4
            KDBG_L("KEY_OFF_LOCK_TO_ITEM4");
            requestFlapClose(false);
          }
#endif
        } else if (keyOffRetractEnabled() && item != 0 && item != 3 && autoLevelBusy) {
          KDBG_L("KEY_OFF_FOLD_PENDING");
          pendingKeyOffFold = 1;
        } else if (!keyOffRetractEnabled()) {
          statusLedUpdate();
        }
      }
      updatePin9Power();
    }
  } else if (pin2KeyOffStable() && !keyOffFoldHandled && keyOffRetractEligible() &&
             keyOffRetractEnabled() && item == 1) {
    KDBG_L("KEY_OFF_BLOCKED_BOOT_SETTLE");
  }

  // 开机保护期内关钥匙会漏掉下降沿：出保护后若仍关钥匙且本轮曾开过，补 arm 一次
  if (!inBootSettle() && !isSelfCheckFaultLatched() && pin2KeyOffStable() && pin2SeenHighSinceBoot
      && pin9HoldUntil == 0 && !pin9HoldExpired) {
    KDBG_L("KEY_OFF_ARM_CATCHUP");
    armPin9KeyOffHold();
    updatePin9Power();
  }

  if (pin2KeyOnStable() && (isKeyOffCountdownActive() || pin9HoldExpired)) {
    if (item == 3) {
      cancelKeyOffHoldOnKeyOn();
      updatePin9Power();
    } else {
      KDBG_KV("KEY_ON_SOFT_RESET", item, powerOnFlip);
      requestSoftwareReset();
    }
  }

  lastPin2High = pin2High;
}

/* =============================================================================
 * BLOCK: Stealth mode — 隐蔽模式（折回后 Pin9 拉低；EEPROM 记忆；重上电保持隐蔽且无 PWM，退出后恢复）
 * ============================================================================= */
static void stealthFoldToLockFast();
static void finishStealthSession(uint8_t autoPowerOff);

static void stealthAckBlink(uint8_t times) {
  for (uint8_t i = 0; i < times; i++) {
#if F3_MAX_BUILD
    f3WriteLeds(0, 1);
#else
    digitalWrite(8, HIGH);
#endif
    delayWithBlePoll((unsigned long)STEALTH_ACK_ON_MS);
#if F3_MAX_BUILD
    f3WriteLeds(0, 0);
#else
    digitalWrite(8, LOW);
#endif
    if (i + 1 < times) {
      delayWithBlePoll((unsigned long)STEALTH_ACK_OFF_MS);
    }
  }
}

void enterStealthMode() {
  if (item == 3) return;
  reboundWaitUntil = 0;
  reboundAttempt = 0;
  foldAdjustActive = 0;
  pendingKeyOffFold = 0;
  keyOffRetractBusy = 0;
  stealthEntryBusy = 1;

  releasePin9KeyOffHold();
  digitalWrite(9, HIGH);

  // 先折到锁止位 item4，再闪灯确认（避免闪灯期间关钥匙收回抢舵机）
  stealthFoldToLockFast();

#if F3_MAX_BUILD
  f3WriteLeds(0, 1);
#else
  digitalWrite(8, HIGH);
#endif
  stealthAckBlink(2);

  item = 3;
  stealthActive = 1;
  stealthElapsedMin = 0;
  stealthMinuteMark = millis();
  stealthEntryBusy = 0;

  invalidateServoHold();
  foldHoldActive = 1;
  openEaseActive = 0;
  forceServoMove = 0;
  servoStopHold();
  servoMotionOff();
#if F3_MAX_BUILD
  stealthPersistSave(1);
#endif
#if F3_MAX_BUILD
  f3WriteLeds(0, 0);
#else
  digitalWrite(8, LOW);
#endif
  updatePin9Power();
#if F2_SERIAL_DEBUG
  Serial.println(F("STEALTH enter"));
#endif
}

static void finishStealthSession(uint8_t autoPowerOff) {
#if F3_MAX_BUILD
  stealthPersistClear();
#endif
  stealthActive = 0;
  item = 0;
  stealthElapsedMin = 0;
  stealthMinuteMark = 0;
  invalidateServoHold();
  forceServoMove = 0;
  releasePin9KeyOffHold();
  if (autoPowerOff && digitalRead(2) == LOW) {
    expirePin9KeyOffHold();
    digitalWrite(9, LOW);
  } else {
    digitalWrite(9, HIGH);
  }
  updatePin9Power();
  statusLedUpdate();
  if (autoPowerOff) {
    foldHoldActive = 1;
  } else {
    lastWrittenAngle = item4;
    bootStallEn = userServoSpeed >= SERVO_SPEED_MAX_PCT;
    bootMoveToFold();
    bootStallFinish();
  }
  btn5NoteStealthExited();
}

void exitStealthMode() {
#if F3_MAX_BUILD
  f3WriteLeds(0, 1);
#else
  digitalWrite(8, HIGH);
#endif
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

  // 隐蔽模式：Pin9 拉低（断电隐蔽）；重上电由 EEPROM 恢复后继续隐蔽循环
  if (item == 3 && stealthActive) {
    pin9HoldUntil = 0;
    pin9HoldExpired = 0;
    stealthWindowStart = 0;
    digitalWrite(9, LOW);
    return;
  }

#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
  // 测高配置：小程序逐字发 DA/TB，勿因延时断电拉低 Pin9 误判死机
  if (f3HeightCfgModeActive()) {
    digitalWrite(9, HIGH);
    return;
  }
#endif

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

#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
  if (f3HeightCfgModeActive()) return;
#endif

  if (item == 3 && stealthActive) {
    if (digitalRead(9) != LOW) {
      digitalWrite(9, LOW);
      KDBG_L("PIN9_WDT_STEALTH");
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
      KDBG_L("PIN9_WDT_FAULT");
    }
    return;
  }

  bool shouldCut = false;
  if (pin9HoldExpired && digitalRead(2) == LOW) {
    shouldCut = true;
  }

  if (shouldCut && digitalRead(9) != LOW) {
    digitalWrite(9, LOW);
    KDBG_L("PIN9_WDT_CUT");
  }
}

// 打开收回：关钥匙期间确保折回；运动交给 updateServoOutput 平滑处理
void tickAccRetractJudge() {
  if (isSelfCheckFaultLatched()) return;
  if (inBootSettle()) return;
  if (item == 3) return;
#if F3_MAX_BUILD
  if (stealthEntryBusy) return;
#endif
  if (!keyOffRetractEnabled()) return;
  if (!pin2KeyOffStable()) return;
  if (!keyOffRetractEligible()) return;
  if (keyOffRetractIssued) return;

  keyOffRetractIssued = 1;
  if (item == 1 || openEaseActive || flapCloseMoving()) {
    requestFlapClose(false);
    return;
  }
#if F3_MAX_BUILD
  // 已在折叠态：断电锁死须再推到 item4（不要停在 item4-10）
  if (item == 0) {
    int goal = f3KeyOffFoldTarget();
    int lv = readServoAngleLive();
    if (lv < 0 || lv > 180 || abs(lv - goal) > 2) {
      requestFlapClose(false);
    }
  }
#else
  if (item == 0 && !flapPhysicallyAtFold()) {
    requestFlapClose(false);
  }
#endif
}

int readServoAngle() {
  if (forceServoMove || openEaseActive || reboundAttempt >= 1) {
    int live = servo.read();
    if (live >= 0 && live <= 180) return live;
  }
  if (lastWrittenAngle >= 0 && lastWrittenAngle <= 180) return lastWrittenAngle;
  int cur = servo.read();
  if (cur < 0 || cur > 180) cur = item4;
  return cur;
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
  if (foldAdjustActive) return false;
  return reboundFaultLatched || pendingFaultReport == 1 || pendingFaultReport == 2;
}

void statusLedUpdate() {
  f3StatusLedUpdate();
}

void blinkPin8(uint8_t times, int onMs, int offMs) {
  digitalWrite(8, LOW);
  for (uint8_t i = 0; i < times; i++) {
    digitalWrite(F3_PIN_LED_GREEN, HIGH);
    delayWithBlePoll((unsigned long)onMs);
    digitalWrite(F3_PIN_LED_GREEN, LOW);
    if (i + 1 < times) delayWithBlePoll((unsigned long)offMs);
  }
  statusLedUpdate();
}

void blinkPin8Fault(uint8_t times, int onMs, int offMs) {
#if F3_MAX_BUILD
  digitalWrite(F3_PIN_LED_GREEN, LOW);
#endif
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
  openEaseActive = 0;
}

void abortOpenMotion() {
  openEaseActive = 0;
  flapSettleUntil = 0;
}

void writeServoDirect(int angle) {
  if (item == 3) return;
  if (angle < 0) angle = 0;
  if (angle > 180) angle = 180;
  openEaseActive = 0;
  flapSettleUntil = 0;
  forceServoMove = 1;
  servoTrackItem = -1;
  servoTrackAngle = angle;
}

static void waitServoReach(int angle) {
  unsigned long deadline = millis() + 12000UL;
  int expectItem = item;
  while (!servoMoveCommitted(angle) && !isSelfCheckFaultLatched() && (long)(millis() - deadline) < 0) {
    if (forceServoMove || item != expectItem) break;
    if (item == 0 || item == 1) updateServoOutput();
    pollBleSerial();
    watchdogFeed();
    tickStealthKeyWindow();
    updatePin9Power();
    delayWithBlePoll(16);
  }
}

// 进入隐蔽：满速折到锁止位 item4，折完再切 item=3
static void stealthFoldToLockFast() {
  int target = item4;
  if (target < 0) target = 0;
  if (target > 180) target = 180;

  int cur = readServoAngleLive();
  if (cur < 0 || cur > 180) {
    cur = lastWrittenAngle;
    if (cur < 0 || cur > 180) {
      cur = (item == 1) ? bianlaing : f3FoldUserTarget();
    }
  }

  abortOpenMotion();
  reboundWaitUntil = 0;
  foldAdjustActive = 0;
  item = 0;
  foldHoldActive = 0;
  forceServoMove = 1;
  invalidateServoHold();
  statusLedUpdate();
  lastWrittenAngle = cur;

  if (abs(cur - target) <= 2) {
    servoPrepareMove();
#if F2_VARSERVO
    servo.write(target, 255);
#else
    servo.write(target);
#endif
    servoFinalizePosition(target);
    lastWrittenAngle = target;
    servoTrackItem = 0;
    servoTrackAngle = target;
    foldHoldActive = 1;
    forceServoMove = 0;
    return;
  }

  unsigned long deadline = millis() + 12000UL;
  unsigned long lastCmdMs = 0;
  uint8_t stableHits = 0;

  while ((long)(millis() - deadline) < 0 && !isSelfCheckFaultLatched()) {
    unsigned long now = millis();
    pollBleSerial();
    watchdogFeed();
    updatePin9Power();

    int live = readServoAngleLive();
    if (live >= 0 && abs(live - target) <= 3) {
      if (++stableHits >= 5) break;
    } else {
      stableHits = 0;
    }

    if (lastCmdMs == 0 || (now - lastCmdMs) >= 80UL) {
      lastCmdMs = now;
      if (servoPwmOff) servoPrepareMove();
#if F2_VARSERVO
      servo.write(target, 255);
#else
      servo.write(target);
#endif
      servoTrackItem = 0;
      servoTrackAngle = target;
    }
    delayWithBlePoll(16);
  }

  if (!isSelfCheckFaultLatched()) {
    servoFinalizePosition(target);
  }
  foldHoldActive = 1;
  forceServoMove = 0;
}

bool servoAtAngle(int angle) {
  return lastWrittenAngle >= 0 && abs(lastWrittenAngle - angle) <= 3;
}

bool servoMoveCommitted(int angle) {
  return servoAtAngle(angle) && servoTrackItem == item && servoTrackAngle == angle;
}

void writeServo(int angle) {
  if (item == 3) return;
  if (angle < 0) angle = 0;
  if (angle > 180) angle = 180;

  if (reboundAttempt >= 1 && item == 1 && angle == bianlaing) {
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
        if (tickMotionA0Realtime(true)) return;
      }
      if (item != 1) return;
      if (isSelfCheckFaultLatched()) return;
      servoFinalizePosition(angle);
    if (servoAtAngle(angle) && !openEaseActive && item == 1) {
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

  openEaseActive = 0;
  forceServoMove = 1;
  servoTrackItem = -1;
  servoTrackAngle = angle;
  flapSettleUntil = 0;
}

// 翻板非阻塞：折叠微调走 tickFlapServoHold
void updateServoOutput() {
  if (item != 0 && item != 1) return;
  if (isSelfCheckFaultLatched()) return;
  if (reboundWaitUntil > 0 && !forceServoMove) return;
  int target;
  if (item == 1) {
    target = bianlaing;
  } else {
#if F3_MAX_BUILD
    target = f3FoldMotionTarget();
#else
    target = item4;
#endif
  }

#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
  if (f3CalPreviewActive && item == 0) {
    tickFlapServoHold(f3CalPreviewAngle);
    return;
  }
#endif

  if (foldAdjustActive && item == 0) {
    tickFlapServoHold(item4);
    return;
  }

  if (openEaseActive) {
    servoWriteEaseStep(target, 0);
    if (stallCheckActive() && btnDetectWindowActive()) {
      tickMotionA0Realtime(false);
    }
    return;
  }
  tickFlapServoHold(target);
}

#if F2_MOTION_A0_DEBUG
void debugPrintMotionA0(int a0) {
  if (!btnDetectWindowActive()) return;
  if (item != 0 && item != 1) return;
  Serial.println(a0);
}
#endif

/* =============================================================================
 * BLOCK: Flap control — 翻开 / 折回
 * ============================================================================= */
void requestFlapOpen(bool stallRetry) {
  if (item == 1 && !stallRetry && servoMoveCommitted(bianlaing)) return;
  if (!stallRetry && f3FlapOpenDangerBlocked()) return;
  if (!stallRetry && !canUserFlapControl()) return;
  if (item == 3 || autoLevelBusy) return;

  // 仅真·中途反向才宽限；静止打开必须立刻可检（勿沿用收回遗留的 stallIgnore）
  uint8_t midMove = forceServoMove || openEaseActive || (flapSettleUntil != 0);
  if (!stallRetry && midMove) {
    armStallGraceAfterUserReverse();
  } else if (!stallRetry) {
    stallIgnoreUntil = 0;
  }

  abortOpenMotion();
  reboundWaitUntil = 0;
  if (!stallRetry) reboundRetryOpen = 0;

  foldAdjustActive = 0;
  int cur = readServoAngleLive();
  if (cur < 0 || cur > 180) {
    cur = lastWrittenAngle;
    if (cur < 0 || cur > 180) cur = item4;
  }
  item = 1;
  pin2SeenHighSinceBoot = 1;
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
  if (f3HfCfg & 1) {
    f3ArmFoldCloseWatch();
  } else {
    f3ClearFoldCloseWatch();
  }
#endif
  statusLedUpdate();
  invalidateServoHold();
  foldHoldActive = 0;
  lastWrittenAngle = cur;
  forceServoMove = 1;
  // 与收回对称：只要堵转开着就开检测窗（打开→折叠）
  if (motionCheckActive()) {
    beginOpenAttempt(stallRetry);
    restartBtnDetectWindow();
  }
  lastStatusSend = 0;
}

void requestFlapClose(bool userRequest) {
  if (userRequest) {
    if (item == 3 || autoLevelBusy) return;
  }
#if F3_MAX_BUILD
  int userFoldT = f3FoldUserTarget();
#else
  int userFoldT = item4;
#endif
  if (userRequest && item == 0 && !openEaseActive && servoMoveCommitted(userFoldT)) return;

  if (userRequest && item == 0 && !servoMoveCommitted(userFoldT)) {
    if (servoTrackItem == 0 && servoTrackAngle == userFoldT) {
      return;
    }
  }

  if (!userRequest) {
    clearOpenMonitor();
    armKeyOffRetractSuppress();
#if F3_MAX_BUILD
    int foldGoal = f3KeyOffFoldTarget();
#else
    int foldGoal = item4;
#endif
    if (item == 0 && !openEaseActive && servoMoveCommitted(foldGoal) &&
        abs(readServoAngleLive() - foldGoal) <= 2) {
      return;
    }
  } else {
    // 用户收回（亮→灭）：与打开对称开检测窗；中途反向用更短宽限
    uint8_t midMove = forceServoMove || openEaseActive || (flapSettleUntil != 0);
    if (midMove) {
      armStallGraceCloseReverse();
    } else {
      stallIgnoreUntil = 0;
    }
    if (motionCheckActive() || (stallCheckActive() && userServoSpeed >= SERVO_SPEED_MAX_PCT)) {
      foldHoldActive = 0; // 避免上一拍 hold 挡住开窗
      restartBtnDetectWindow();
    }
  }
  foldToRetract();
}

void eePutBlink(int addr, int val) {
  EEPROM.put(addr, val);
  lastStatusSend = 0;
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
  f3ForceStatusOnce = 1;
#endif
  sendStatusPacket();
}

void resetOpenGuard() {
  openStartMs = millis();
  lastMotorSampleMs = 0;
  stuckCount = 0;
  lastMotorA0 = -1;
}

void beginOpenAttempt(bool preserveStallCount) {
  reboundWaitUntil = 0;
  if (!preserveStallCount) {
    // 不在此处清 reboundFaultLatched：堵转锁必须重启才解除
    reboundAttempt = 0;
  }
  resetOpenGuard();
#if F2_SERIAL_DEBUG
  Serial.println(preserveStallCount ? F("OPEN stall retry") : F("OPEN attempt start"));
#endif
}

void foldToRetract() {
  if (item == 3) return;
  abortOpenMotion();
  reboundWaitUntil = 0;
  if (!reboundRetryOpen && !stallRetryClosing) reboundAttempt = 0;
  stealthActive = 0;
  foldAdjustActive = 0;
  int cur = readServoAngleLive();
  if (cur < 0 || cur > 180) {
    cur = lastWrittenAngle;
    if (cur < 0 || cur > 180) cur = f3FoldMotionTarget();
  }
  item = 0;
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
  f3ClearFoldCloseWatch();
#endif
  statusLedUpdate();
  forceServoMove = 1;
  foldHoldActive = 0;
  invalidateServoHold();
  lastWrittenAngle = cur;
  lastStatusSend = 0;
}

// 未解锁/开机未到位 / 堵转终报回原位：强制推到锁止角 item4
static void faultRetreatToItem4() {
  item = 0;
  abortOpenMotion();
  reboundWaitUntil = 0;
  reboundRetryOpen = 0;
  reboundRetryClose = 0;
  foldAdjustActive = 0;
  foldHoldActive = 1;
  invalidateServoHold();
  servoCancelPwmHold();
  servoPrepareMove();
  int t = item4;
  if (t < 0) t = 0;
  if (t > 180) t = 180;
  unsigned long t0 = millis();
  while ((millis() - t0) < 1200UL) {
    watchdogFeed();
    if (servoPwmOff) servoPrepareMove();
#if F2_VARSERVO
    servo.write(t, 255);
#else
    servo.write(t);
#endif
    lastWrittenAngle = t;
    delayWithBlePoll(20);
  }
  servoFinalizePosition(t);
  lastWrittenAngle = t;
  servoTrackItem = 0;
  servoTrackAngle = t;
  statusLedUpdate();
}

void triggerStallRebound(unsigned long detectElapsed) {
  if (reboundFaultLatched) return;
  stuckCount = 0;

  // 灭→亮前 0.4s 堵转：机械未解锁 → 与开机相同，item4-2 ↔ 日常折叠位反复试
  // detectElapsed 由调用方在清窗前传入
  if (item == 1 && detectElapsed > 0 && detectElapsed < EARLY_OPEN_LOCK_STALL_MS) {
    abortOpenMotion();
    clearOpenMonitor();
    bootStallRecoverLoop();
    return;
  }

  if (reboundAttempt + 1 >= STALL_REBOUND_MAX) {
    reboundAttempt = STALL_REBOUND_MAX;
    reboundFaultLatched = 1;
    bootStallEn = 0; // 勿沿用开机狂闪标记，否则会变成纯红快闪
    savePendingFaultReport(2);
    // 终报后回到收回原位（折叠失败勿停半途继续收；收回失败亦先回稳）
    faultRetreatToItem4();
    enterFaultLockState();
    return;
  }
  reboundAttempt++;
  abortOpenMotion();
  clearOpenMonitor();
  stallIgnoreUntil = millis() + 800UL;
  if (item == 1) {
    // 打开中段碰胎 → 先收回，再尝试打开
    reboundRetryOpen = 1;
    reboundRetryClose = 0;
    foldToRetract();
  } else if (item == 0) {
    // 收回途中遇阻 → 先翻开躲开，再尝试收回
    reboundRetryClose = 1;
    reboundRetryOpen = 0;
    requestFlapOpen(true);
  } else {
    reboundAttempt = STALL_REBOUND_MAX;
    reboundFaultLatched = 1;
    bootStallEn = 0;
    savePendingFaultReport(2);
    faultRetreatToItem4();
    enterFaultLockState();
    return;
  }
  reboundWaitUntil = millis() + REBOUND_RETRY_WAIT_MS;
  statusLedUpdate();
  lastStatusSend = 0;
}

void clearOpenMonitor() {
  btnDetectStartMs = 0;
  openStartMs = 0;
  clearBtnDetectSamples();
}

void selfCheckTick() {
  if (btnDetectWindowActive()) {
    tickMotionA0Realtime(false);
  }
}

void tickReboundStateMachine() {
  if (inBootSettle()) return;
  if (autoLevelBusy) return;
  if (!stallCheckActive()) {
    reboundWaitUntil = 0;
    reboundAttempt = 0;
    return;
  }
  if (reboundFaultLatched) {
    return;
  }
  if (reboundWaitUntil > 0) {
    if (millis() >= reboundWaitUntil) {
      reboundWaitUntil = 0;
      if (reboundRetryOpen) {
        reboundRetryOpen = 0;
        requestFlapOpen(true);
      } else if (reboundRetryClose) {
        reboundRetryClose = 0;
        stallRetryClosing = 1;
        requestFlapClose(true);
        stallRetryClosing = 0;
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

void clearFaultFlags() {
  // 堵转锁存必须重启才清；故障已读只清上报位，灯继续闪
  clearPendingFaultReport();
}

bool isSelfCheckFaultLatched() {
  return faultIndicatorActive();
}

// 堵转锁定：立刻断 PWM，指示灯由 tickFaultAlarm 一直闪直到重启
void enterFaultLockState() {
  reboundWaitUntil = 0;
  reboundRetryOpen = 0;
  reboundRetryClose = 0;
  stealthActive = 0;
#if F3_MAX_BUILD
  stealthPersistClear();
#endif
  pendingKeyOffFold = 0;
  openEaseActive = 0;
  forceServoMove = 0;
  flapSettleUntil = 0;
  clearOpenMonitor();
  abortOpenMotion();
  invalidateServoHold();
  foldHoldActive = 1;
  servoStopHold();
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
  f3FoldCloseFault = 0;
  f3FoldCloseWatchMs = 0;
  f3DgdLatch = f3DgdSafeCnt = f3DgdUnsafeCnt = 0;
#endif
  // 灯型交给 tickFaultAlarm（ERR1 红闪 / ERR2 红绿交替）
  tickFaultAlarm();
  lastStatusSend = 0;
  sendStatusPacket();
}

#if F2_BLE_STATUS
static void printStatusLine(Stream &out, int ang, int accPin, int btnPin, uint8_t err, uint8_t wrn) {
  out.print(F("ANG:"));
  out.print(ang);
  out.print(F("|ACC:"));
  out.print(accPin);
  out.print(F("|BTN:"));
  out.print(btnPin);
  out.print(F("|ITM:"));
  out.print(statusItemForBle());
#if !F3_FLASH_TIGHT
  out.print(F("|SMO:"));
  out.print(0);
  out.print(F("|STD:"));
  out.print(stallCheckActive() ? 1 : 0);
  out.print(F("|RET:"));
  out.print(accRetractOn);
  out.print(F("|PWR:"));
  out.print(powerOnFlip);
#endif
  out.print(F("|ERR:"));
  out.print(err);
#if !F3_FLASH_TIGHT
  out.print(F("|WRN:"));
  out.print(wrn);
#endif
#if !F3_FLASH_TIGHT
  out.print(F("|STM:"));
  if (item == 3 && stealthElapsedMin < STEALTH_AUTO_OFF_MIN) {
    out.print((uint16_t)(STEALTH_AUTO_OFF_MIN - stealthElapsedMin));
  } else {
    out.print(0);
  }
#endif
#if !F3_FLASH_TIGHT
  out.print(F("|STB:"));
  out.print(stealthBtnExitOn ? 1 : 0);
  out.print(F("|SPD:"));
  out.print(userServoSpeed);
#endif
#if F3_HEIGHT_ENABLE
  if (f3HeightMonitorActive() && f3BleHgtThisPkt) {
    out.print(F("|HGT:"));
    out.print((f3SensorOk && f3SensorValid && f3LastFiltMm > 0) ? (unsigned int)f3LastFiltMm : 0U);
  }
  out.print(F("|F3C:"));
  out.print(f3HeightCfgMode ? 1 : 0);
  out.print(F("|DGA:"));
  out.print(f3DangerMm);
  out.print(F("|DGB:"));
  out.print(f3BaseMm);
  out.print(F("|DGD:"));
  out.print(f3DangerLedActive() ? 1 : 0);
  out.print(F("|HF:"));
  out.print(f3HfCfg);
#endif
#if F3_IMU_ENABLE
  f3ImuAppendStatus(out);
#endif
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
  if (item == 1 && (f3HfCfg & 1)) {
    out.print(F("|F3W:"));
    out.print(f3FoldCloseFault ? 2 : (f3FoldCloseWatchMs ? 1 : 0));
  }
#endif
  if (statusItemForBle() == 2 && (item == 0 || item == 1)) {
#if !F3_FLASH_TIGHT
    out.print(F("|MOT:"));
    out.print(item);
#endif
  }
#if F3_MAX_BUILD && !F3_FLASH_TIGHT
  out.print(F("|POL:"));
  out.print(f3PowerOffLockOn ? 1 : 0);
#endif
  out.println();
}

void sendStatusPacket() {
  pollBleSerial();
  if (bleSerialRxBusy()) return;

  uint8_t err = 0;
  uint8_t wrn = 0;
  if (!foldAdjustActive) {
    // 以 EEPROM/待报类型为准，避免 bootStallEn 把卡住堵转误判成 ERR1
    if (pendingFaultReport == 1) err = 1;
    else if (pendingFaultReport == 2) err = 2;
    else if (bootStallEn == 2) err = 1;
    else if (reboundFaultLatched) err = 2;
    if (reboundWaitUntil > 0) wrn = 1;
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
    else if (f3FoldCloseFault) wrn = 3;
#endif
  }
  bool motion = flapMotionMoving() || openEaseActive;
  unsigned long now = millis();
  // 心跳：至少每 400ms 发一包，避免串口 RX 噪声导致长期静默、小程序误判掉线
  bool heartbeat = (now - lastStatusSend >= 400UL);
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
  if (f3HeightCfgModeActive()) {
    /* 正在收 DA/TB/M 逐字命令时停发状态包，避免占满串口 */
    if (rxLen > 0 && (rxBuf[0] == 'D' || rxBuf[0] == 'T' || rxBuf[0] == 'M')) return;
    if (!f3ForceStatusOnce && !heartbeat) return;
    if (f3ForceStatusOnce) f3ForceStatusOnce = 0;
  }
#endif
  int accPin = digitalRead(2);
  int btnPin = digitalRead(5);
  static int lastAccPin = -1;
  static int lastBtnPin = -1;
  static int lastItmSent = -1;
  uint8_t ioChanged = (accPin != lastAccPin || btnPin != lastBtnPin) ? 1 : 0;
  int itmNow = statusItemForBle();
  uint8_t itmChanged = (itmNow != lastItmSent) ? 1 : 0;
#if F3_HEIGHT_ENABLE
  static uint16_t lastHgtSent = 0;
  static uint8_t lastDgdSent = 255;
  uint8_t hgtChanged = 0;
  uint8_t dgdNow = f3DangerLedActive() ? 1 : 0;
  uint8_t dgdChanged = (dgdNow != lastDgdSent) ? 1 : 0;
  f3BleHgtThisPkt = 0;
  const unsigned long hgtBleMs = f3HeightCfgModeActive() ? F3_CFG_HGT_BLE_MS : F3_HGT_BLE_MS;
  if (f3HeightMonitorActive()) {
    f3BleHgtThisPkt = 1;
    if (now - f3LastHgtBleMs >= hgtBleMs) {
      hgtChanged = (f3SensorOk && f3SensorValid && f3LastFiltMm != lastHgtSent) ? 1 : 0;
      if (!hgtChanged && f3SensorOk && f3SensorValid && f3LastFiltMm > 0) hgtChanged = 1;
      f3LastHgtBleMs = now;
    }
  } else {
    f3LastHgtBleMs = 0;
    lastHgtSent = 0;
  }
#else
  const uint8_t hgtChanged = 0;
  const uint8_t dgdChanged = 0;
#endif
  unsigned long minGap = motion ? 350UL : 400UL;
  if (!ioChanged && !itmChanged && !hgtChanged && !dgdChanged && !heartbeat && err == 0 && wrn == 0 &&
      now - lastStatusSend < minGap) return;
  lastStatusSend = now;
  if (ioChanged) {
    lastAccPin = accPin;
    lastBtnPin = btnPin;
  }
  lastItmSent = itmNow;
#if F3_HEIGHT_ENABLE
  lastDgdSent = dgdNow;
  if (hgtChanged) lastHgtSent = f3LastFiltMm;
#endif
  int ang;
  if (item == 0 || item == 1) {
    ang = (item == 1) ? bianlaing : item4;
  } else {
    ang = item4;
  }
  printStatusLine(mySerial, ang, accPin, btnPin, err, wrn);
  pollBleSerial();
}
#else
void sendStatusPacket() {}
#endif

void resetSelfCheckMonitor() {
  clearBtnDetectSamples();
}

// 故障报警：
//   ERR1/开机未到位/未解锁 → 仅红灯闪
//   ERR2/卡住堵转、遇阻重试 → 红-绿-红-绿 互斥交替（一亮一灭）
// 倒计时期间强制灭灯。
void tickFaultAlarm() {
  if (isKeyOffCountdownActive()) {
    f3WriteLeds(0, 0);
    return;
  }
  uint8_t err1 = 0, err2 = 0;
  if (pendingFaultReport == 1) err1 = 1;
  else if (pendingFaultReport == 2) err2 = 1;
  else if (bootStallEn == 2) err1 = 1;
  else if (reboundFaultLatched) err2 = 1;

  if (err1) {
    // 电机不转 / 未解锁：仅红闪
    digitalWrite(F3_PIN_LED_GREEN, LOW);
    digitalWrite(8, (millis() / FAULT_ERR1_BLINK_MS) % 2UL ? HIGH : LOW);
    return;
  }
  if (err2 || reboundAttempt > 0) {
    // 卡住堵转 / 遇阻重试：红亮绿灭 ↔ 红灭绿亮
    bool redPhase = ((millis() / FAULT_ERR2_BLINK_MS) & 1UL) != 0;
    f3WriteLeds(redPhase ? 1 : 0, redPhase ? 0 : 1);
    return;
  }
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
  if (f3FoldCloseFault && !foldAdjustActive && !f3HeightCfgModeActive()) {
    bool redPhase = ((millis() / F3_FOLD_FAULT_BLINK_MS) & 1UL) != 0;
    f3WriteLeds(redPhase ? 1 : 0, redPhase ? 0 : 1);
    return;
  }
#endif
}

/* =============================================================================
 * BLOCK: Pin5 按键 — 单击翻板；按住满 2s 立即进隐蔽；隐蔽内按住 8s 退出
 * ============================================================================= */
#define BTN5_PIN 5
const unsigned long BTN5_ENTER_MS = 2000UL;
const unsigned long BTN5_EXIT_MS = 8000UL;
const unsigned long BTN5_SHORT_MIN_MS = 80UL;   // 短于此时长忽略，防误触
const unsigned long BTN5_RELEASE_DEBOUNCE_MS = 25UL;

static unsigned long btn5DownSince = 0;
static unsigned long btn5UpSince = 0;
static unsigned long btn5ExitSince = 0;
static uint8_t btn5EnterDone = 0;
static uint8_t btn5SuppressExit = 0;

static bool btn5PinDown() {
  return digitalRead(BTN5_PIN) == LOW;
}


static void btn5ToggleFlap() {
  if (item == 3 || autoLevelBusy || stealthEntryBusy) return;
  if (!canUserFlapControl()) return;
#if F3_IMU_ENABLE
  // 过坑红灯：禁止再往下折叠；已翻开时仍允许收回（碰胎快撤）
  if (f3BumpFlapLocked() && item == 0) return;
#endif
  lastStatusSend = 0;
  if (item == 0) {
    if (f3FlapOpenDangerBlocked()) return;
    requestFlapOpen();
  } else {
    requestFlapClose(true);
  }
}

// 短按松开才翻板；长按满 2s 进隐蔽（按下瞬间不动作，避免与长按冲突）
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
#if F3_MAX_BUILD
  digitalWrite(8, LOW);
  f3WriteLeds(0, 1);
#else
  digitalWrite(8, HIGH);
#endif
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

  // 关钥匙 10 秒后 Pin9 断电：按键无反应（前 10 秒仍可长按进隐蔽）
  if (digitalRead(2) == LOW && item != 3 && !isStealthEntryWindow()) {
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

  unsigned long held = now - btn5DownSince;
  if (!btn5EnterDone && held >= BTN5_ENTER_MS) {
    btn5DoEnterStealth(held);
  } else if (!btn5EnterDone && held >= BTN5_SHORT_MIN_MS && held < BTN5_ENTER_MS) {
    btn5ToggleFlap();
  }

  btn5DownSince = 0;
  btn5UpSince = 0;
  btn5EnterDone = 0;
}

// 自动调平日志（F3_FLASH_TIGHT 关闭以省闪存）
#if !F3_FLASH_TIGHT
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

#if !F3_FLASH_TIGHT
int autoScanStall(int from, int to, int thr) {
#if !F3_FLASH_TIGHT
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
#if !F3_FLASH_TIGHT
    autoLevelLogScan(a, a0, thr);
#endif
    if (a0 < thr) {
#if !F3_FLASH_TIGHT
      autoLevelLogHit(a, a0);
#endif
      return a;
    }
  }
#if !F3_FLASH_TIGHT
  autoLevelLogKV(F("ALOG SCAN end ang="), to);
#endif
  return to;
}
#endif

#if !F3_FLASH_TIGHT
void runAutoLevel() {
  if (autoLevelBusy) {
    blinkPin8(1, 80, 80);
    return;
  }

  if (item == 3) {
#if F3_MAX_BUILD
    stealthPersistClear();
#endif
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
  servoPrepareMove();
  servo.write(120);
  lastWrittenAngle = 120;
  delayWithBlePoll(1500);

  y = autoScanStall(120, 180, AUTO_LEVEL_FOLD_THR);
  y -= 10;
  int u = autoScanStall(y, 180, AUTO_LEVEL_FOLD_THR);
  if (u == 180) {
    item4 = 180;
    delayWithBlePoll(300);
  } else {
    item4 = u - 3;
  }
  EEPROM.put(3, item4);

  servo.write(90);
  lastWrittenAngle = 90;
  y = autoScanStall(90, 0, AUTO_LEVEL_OPEN_THR);
  y += 10;
  int m = autoScanStall(y, 0, AUTO_LEVEL_OPEN_THR);
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
  EEPROM.put(1, bianlaing);

  invalidateServoHold();
  item = 0;
  writeServo(f3FoldUserTarget());
  waitServoReach(f3FoldUserTarget());
  autoLevelBusy = 0;
}
#else
void runAutoLevel() {
  if (autoLevelBusy) {
    blinkPin8(1, 80, 80);
    return;
  }
  blinkPin8(1, 80, 80);
}
#endif

static void moveServoToFoldAngle(int angle);

#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
static bool f3CalPreviewAngleAllowed(int ang) {
  return ang >= 0 && ang <= 180;
}

static void f3CalPreviewStep(int delta) {
  if (item == 3) return;
  if (!f3CalPreviewActive) {
    f3CalPreviewActive = 1;
    foldAdjustActive = 1;
    int cur = readServoAngleLive();
    if (cur < 0 || cur > 180) cur = item4;
    if (!f3CalPreviewAngleAllowed(cur)) cur = item4;
    f3CalPreviewAngle = cur;
  }
  int next = f3CalPreviewAngle + delta;
  if (!f3CalPreviewAngleAllowed(next)) return;
  if (next == f3CalPreviewAngle) return;
  f3CalPreviewAngle = next;
  item = 0;
  foldAdjustActive = 1;
  moveServoToFoldAngle(f3CalPreviewAngle);
  lastStatusSend = 0;
}

static void f3CalFoldRestore() {
  f3CalPreviewActive = 0;
  foldAdjustActive = 0;
  EEPROM.get(3, item4);
  if (item4 < 0 || item4 > 180) item4 = 150;
  f3LastPollMs = 0;
  f3SensorSkipUntil = 0;
  moveServoToFoldAngle(item4);
  f3RequestStatusSend();
  sendStatusPacket();
}
#endif

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
#if F3_MAX_BUILD
    if (cur < 0 || cur > 180) cur = f3FoldMotionTarget();
#else
    if (cur < 0 || cur > 180) cur = item4;
#endif
  }
  lastWrittenAngle = cur;
  writeServoDirect(angle);
}

static void applyFoldAdjustStep(int delta) {
  int next = item4 + delta;
  if (next < 0 || next > 180) return;
  if (next == item4) return;
  item4 = next;
  EEPROM.put(3, item4);
  moveServoToFoldAngle(item4);
  lastStatusSend = 0;
  sendStatusPacket();
}

static void bleNotifySettingSaved() {
  lastStatusSend = 0;
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
  f3ForceStatusOnce = 1;
#endif
  sendStatusPacket();
}

static bool handleBlePersistSetting(char *cmd) {
#if F3_MAX_BUILD
  if (cmd[0] == 'H' && cmd[1] >= '0' && cmd[1] <= '1' && !cmd[2]) {
#if F3_HEIGHT_ENABLE
    f3HfCfg = cmd[1] & 1;
    EEPROM.update(F3_EE_HEIGHT_ON, f3HfCfg);
    f3DgdLatch = 0;
    if (!f3HfCfg) {
      f3ClearFoldCloseWatch();
    } else if (item == 1) {
      f3ArmFoldCloseWatch();
    }
    statusLedUpdate();
    bleNotifySettingSaved();
#else
    // TOF 已永久删除：忽略旧测高开关命令
    bleNotifySettingSaved();
#endif
    return true;
  }
  if (cmd[0] == 'P' && (cmd[1] == '1' || cmd[1] == '0') && cmd[2] == 0) {
    f3PowerOffLockOn = cmd[1] == '1' ? 1 : 0;
    EEPROM.put(F3_EE_PWR_LOCK, f3PowerOffLockOn);
    if (f3PowerOffLockOn) {
      accRetractOn = 1;
      EEPROM.put(5, accRetractOn);
    }
    bleNotifySettingSaved();
    return true;
  }
#endif
  if (cmdIsP(cmd, CMD_STEALTH_BTN_ON)) {
    stealthBtnExitOn = 1;
    EEPROM.put(28, stealthBtnExitOn);
    bleNotifySettingSaved();
    return true;
  }
  if (cmdIsP(cmd, CMD_STEALTH_BTN_OFF)) {
    stealthBtnExitOn = 0;
    EEPROM.put(28, stealthBtnExitOn);
    bleNotifySettingSaved();
    return true;
  }
  {
    int spdPct = parseCmdSuffixInt(cmd, CMD_SPEED);
    if (spdPct >= 0) {
      if (spdPct < SERVO_SPEED_MIN_PCT) spdPct = SERVO_SPEED_MIN_PCT;
      if (spdPct > SERVO_SPEED_MAX_PCT) spdPct = SERVO_SPEED_MAX_PCT;
      userServoSpeed = (uint8_t)spdPct;
      EEPROM.put(25, userServoSpeed);
      bleNotifySettingSaved();
      return true;
    }
  }
  if (cmdIsP(cmd, CMD_ACC_ON)) {
    accRetractOn = 1;
    eePutBlink(5, accRetractOn);
    return true;
  }
  if (cmdIsP(cmd, CMD_ACC_OFF)) {
    accRetractOn = 0;
    eePutBlink(5, accRetractOn);
    return true;
  }
  if (cmdIsP(cmd, CMD_CHECK_ON)) {
    selfCheckOn = 1;
    clearFaultFlags();
    eePutBlink(7, selfCheckOn);
    return true;
  }
  if (cmdIsP(cmd, CMD_CHECK_OFF)) {
    selfCheckOn = 0;
    clearFaultFlags();
    stuckCount = 0;
    clearOpenMonitor();
    eePutBlink(7, selfCheckOn);
    return true;
  }
  if (cmdIsP(cmd, CMD_PWR_UP)) {
    powerOnFlip = 0;
    EEPROM.put(9, 0);
    bleNotifySettingSaved();
    return true;
  }
  if (cmdIsP(cmd, CMD_PWR_DN)) {
    powerOnFlip = 1;
    EEPROM.put(9, 1);
    bleNotifySettingSaved();
    return true;
  }
  if (cmdIsP(cmd, CMD_STALL_CHK_ON)) {
    stallDetectOn = 1;
    EEPROM.put(29, stallDetectOn);
    bleNotifySettingSaved();
    return true;
  }
  if (cmdIsP(cmd, CMD_STALL_CHK_OFF)) {
    stallDetectOn = 0;
    EEPROM.put(29, stallDetectOn);
    bleNotifySettingSaved();
    return true;
  }
  return false;
}

void handleBleCommand(char *cmd) {
#if F3_IMU_ENABLE
  if (f3ImuTryHandleBleCmd(cmd)) return;
#endif
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
  if (f3TryShortHeightCmd(cmd)) return;
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

  // 高级设置 EEPROM：不受测高配置/自检故障/隐蔽模式拦截（小程序回读校验依赖 |PWR:|/|STD:|）
  if (handleBlePersistSetting(cmd)) return;

  /* 收起优先：故障锁定时仍允许蓝牙远程收回 */
  if (cmdIsP(cmd, CMD_CLOSE)) {
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
    f3LeaveHeightCfgForFlap();
#endif
    if (item != 3 && !autoLevelBusy) {
      requestFlapClose();
    }
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

  if (item == 3) return;

  if (autoLevelBusy) {
    if (cmdIsP(cmd, CMD_OPEN)) return;
  }

  if (cmdIsP(cmd, CMD_OPEN)) {
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
    f3LeaveHeightCfgForFlap();
#endif
    if (canUserFlapControl() && item != 1 && !f3FlapOpenDangerBlocked()) {
      requestFlapOpen();
    }
    return;
  }
  if (cmdIsP(cmd, CMD_UP)) {
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
    f3BeginOpenAngleBleCmd();
    if (servo.read() > 180) bianlaing = 180;
    else bianlaing += 2;
    f3WriteBianlaingEeprom();
#else
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
#endif
  } else if (cmdIsP(cmd, CMD_DOWN)) {
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
    f3BeginOpenAngleBleCmd();
    if (servo.read() < 0) bianlaing = 0;
    else bianlaing -= 2;
    f3WriteBianlaingEeprom();
#else
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
#endif
  } else if (cmdIsP(cmd, CMD_FULL_OPEN)) {
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
    f3BeginOpenAngleBleCmd();
    bianlaing = fullOpenAngle;
    f3WriteBianlaingEeprom();
#else
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
#endif
  } else if (cmdIsP(cmd, CMD_CUSTOM)) {
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
    f3BeginOpenAngleBleCmd();
    bianlaing = customAngle;
    f3WriteBianlaingEeprom();
#else
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
#endif
  } else if (cmdIsP(cmd, CMD_INIT_ANGLE)) {
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
    f3PrepareUserServoAngleCmd();
#endif
    item4 = 150;
    invalidateServoHold();
    writeServoDirect(item4);
    EEPROM.put(3, item4);
    lastStatusSend = 0;
    sendStatusPacket();
  } else if (cmdIsP(cmd, CMD_ADJ_FOLD)) {
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
    f3EnterAngleAdjustCmd();
#endif
    if (item != 3) {
      moveServoToFoldAngle(item4);
    }
    statusLedUpdate();
    lastStatusSend = 0;
    sendStatusPacket();
  } else if (cmdIsP(cmd, CMD_ADJ_BIG)) {
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
    f3EnterAngleAdjustCmd();
#endif
    applyFoldAdjustStep(-1);
    statusLedUpdate();
  } else if (cmdIsP(cmd, CMD_ADJ_SMALL)) {
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
    f3EnterAngleAdjustCmd();
#endif
    applyFoldAdjustStep(1);
    statusLedUpdate();
  }
}

static uint8_t bootDriveToAngle(int target) {
  if (target < 0) target = 0;
  else if (target > 180) target = 180;
  int start = lastWrittenAngle;
  if (start < 0 || start > 180) start = target;
  unsigned long minMoveMs = (unsigned long)abs(target - start) * 28UL + 450UL;
  if (minMoveMs < 900UL) minMoveMs = 900UL;
  else if (minMoveMs > 1800UL) minMoveMs = 1800UL;
  unsigned long moveStart = millis();
  unsigned long lastCmdMs = 0, lastA0Ms = 0;
  uint8_t stallHits = 0;
  forceServoMove = 1;
  if (servoPwmOff) servoPrepareMove();
  servo.write(target);
  lastWrittenAngle = target;
  while ((millis() - moveStart) < minMoveMs) {
    watchdogFeed();
    updatePin9Power();
    unsigned long now = millis();
    if ((now - moveStart) >= MOTOR_MIN_RUN_BEFORE_STALL_MS &&
        (lastA0Ms == 0 || now - lastA0Ms >= BTN_DETECT_SAMPLE_MS)) {
      lastA0Ms = now;
      if (readMotorA0() < BTN_STALL_A0_THR && ++stallHits >= BOOT_STALL_HITS_NEED) return 1;
    }
    if (lastCmdMs == 0 || now - lastCmdMs >= 60UL) {
      lastCmdMs = now;
      if (servoPwmOff) servoPrepareMove();
      servo.write(target);
    }
    delayWithBlePoll(12);
  }
  return (stallHits >= BOOT_STALL_HITS_NEED);
}

static void bootStallRecoverLoop() {
  reboundFaultLatched = 1;
  savePendingFaultReport(1); // 开机未转动到位 / 未解锁 → 电机不转
  item = 0;
  foldHoldActive = 1;
  abortOpenMotion();
  reboundWaitUntil = 0;
  reboundRetryOpen = 0;
  reboundRetryClose = 0;
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
  f3FoldCloseFault = 0;
  f3DgdLatch = f3DgdSafeCnt = f3DgdUnsafeCnt = 0;
#endif
  // 与开机一致：先到 item4-2，再推日常折叠位（item4-10）
  int retreatT = (int)item4 - 2;
  if (retreatT < 0) retreatT = 0;
  int foldT = f3FoldUserTarget();

  uint8_t nt = 0;
  for (;;) {
    unsigned long t0 = millis();
    (void)bootDriveToAngle(retreatT);
    if (!bootDriveToAngle(foldT)) {
      reboundFaultLatched = 0;
      clearPendingFaultReport();
      bootStallEn = 0;
      reboundAttempt = 0;
      foldHoldActive = 1;
      item = 0;
      servoFinalizePosition(foldT);
      lastWrittenAngle = foldT;
      statusLedUpdate();
      lastStatusSend = 0;
      return;
    }
    unsigned long dt = millis() - t0;
    if (dt < BOOT_STALL_CYCLE_MS) delayWithBlePoll(BOOT_STALL_CYCLE_MS - dt);
    if (++nt >= 20) break;
  }

  bootStallEn = 2;
  faultRetreatToItem4();
  enterFaultLockState();
}

static int waitBootServoReach(int target) {
  int start = lastWrittenAngle;
  if (start < 0 || start > 180) start = target;

  unsigned long minMoveMs = (unsigned long)abs(target - start) * 28UL + 800UL;
  if (minMoveMs > 6500UL) minMoveMs = 6500UL;
  unsigned long moveStart = millis();
  unsigned long deadline = moveStart + minMoveMs + 3500UL;
  unsigned long lastCmdMs = 0;
  unsigned long lastA0Ms = 0;
  uint8_t stallHits = 0;
  forceServoMove = 1;

  while ((long)(millis() - deadline) < 0) {
    unsigned long now = millis();
    pollBleSerial();
    watchdogFeed();
    updatePin9Power();

    if (bootStallEn && (now - moveStart) >= MOTOR_MIN_RUN_BEFORE_STALL_MS &&
        (lastA0Ms == 0 || (now - lastA0Ms) >= BTN_DETECT_SAMPLE_MS)) {
      lastA0Ms = now;
      if (readMotorA0() < BTN_STALL_A0_THR && ++stallHits >= BOOT_STALL_HITS_NEED) {
        bootStallRecoverLoop();
        return lastWrittenAngle;
      }
    }

    if ((now - moveStart) >= minMoveMs) {
      if (bootStallEn && stallHits >= BOOT_STALL_HITS_NEED) {
        bootStallRecoverLoop();
        return lastWrittenAngle;
      }
      lastWrittenAngle = target;
      return target;
    }

    if (lastCmdMs == 0 || (now - lastCmdMs) >= 80UL) {
      lastCmdMs = now;
      if (servoPwmOff) servoPrepareMove();
      servo.write(target);
      lastWrittenAngle = target;
    }
    delayWithBlePoll(16);
  }
  return target;
}

// 开机定位：满速转到目标角并等物理到位后再断 PWM（避免未到位就进自检闪灯）
static void bootMoveToTarget(int target, uint8_t itemState) {
  if (target < 0) target = 0;
  if (target > 180) target = 180;
  item = itemState;
  abortOpenMotion();
  reboundWaitUntil = 0;
  reboundAttempt = 0;
  foldHoldActive = (itemState == 0) ? 1 : 0;
  invalidateServoHold();
  openEaseActive = 0;
  servoCancelPwmHold();
  servoPrepareMove();
  int start = readServoAngleLive();
  if (start < 0 || start > 180) {
    start = (itemState == 1) ? item4 : target;
  }
  lastWrittenAngle = start;
  forceServoMove = 1;

  servo.write(target);
  target = waitBootServoReach(target);
  forceServoMove = 0;
  if (!isSelfCheckFaultLatched()) {
    servoFinalizePosition(target);
    lastWrittenAngle = target;
  }
}

static void bootPwrSettleWait() {
  KDBG_L("BOOT_PWR_WAIT");
  delayWithBlePoll(BOOT_PWR_SETTLE_MS);
}

#if F3_MAX_BUILD
static void f3BootLedOn() {
  digitalWrite(8, LOW);
  digitalWrite(F3_PIN_LED_GREEN, HIGH);
}
static void f3BootLedOff() {
  digitalWrite(F3_PIN_LED_GREEN, LOW);
  digitalWrite(8, LOW);
}
#endif

static void bootBlinkLeadOn() {
#if F3_MAX_BUILD
  f3BootLedOn();
#else
  digitalWrite(8, HIGH);
#endif
  KDBG_L("BOOT_LED_BLINK");
  delayWithBlePoll(BOOT_LED_LEAD_ON_MS);
}

static void bootBlinkLeadOff() {
#if F3_MAX_BUILD
  f3BootLedOff();
#else
  digitalWrite(8, LOW);
#endif
  delayWithBlePoll(500);
}

// 开机下翻：5 次稍快闪烁（比自检 500ms 快闪）；闪灯期间长按 Pin5 可取消下翻
static bool bootFoldBlinkDelayPoll(unsigned long ms, unsigned long &holdSince) {
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
      if (holdSince == 0) holdSince = now;
      else if (now - holdSince >= BTN5_ENTER_MS) {
        return true;
      }
    } else {
      holdSince = 0;
    }
  }
  return false;
}

// 开机下翻：慢闪 5 次；期间长按 Pin5 取消本次下翻并上翻
static bool bootBlinkFoldBootPrompt() {
  unsigned long holdSince = 0;
  for (uint8_t i = 0; i < 5; i++) {
#if F3_MAX_BUILD
    f3BootLedOn();
#else
    digitalWrite(8, HIGH);
#endif
    if (bootFoldBlinkDelayPoll((unsigned long)BOOT_FOLD_SLOW_HALF_MS, holdSince)) {
#if F3_MAX_BUILD
      f3BootLedOff();
#else
      digitalWrite(8, LOW);
#endif
      KDBG_L("BOOT_FOLD_CANCEL");
      return true;
    }
#if F3_MAX_BUILD
    f3BootLedOff();
#else
    digitalWrite(8, LOW);
#endif
    if (bootFoldBlinkDelayPoll((unsigned long)BOOT_FOLD_SLOW_HALF_MS, holdSince)) {
      KDBG_L("BOOT_FOLD_CANCEL");
      return true;
    }
  }
  return false;
}

// 开机下翻展开：不依赖 canUserFlapControl（钥匙可关）
static void bootFlapOpenForce() {
  KDBG_KV("BOOT_OPEN_START", bianlaing, item);
  abortOpenMotion();
  reboundWaitUntil = 0;
  foldAdjustActive = 0;

  int cur = readServoAngleLive();
  if (cur < 0 || cur > 180) {
    cur = lastWrittenAngle;
    if (cur < 0 || cur > 180) cur = item4;
  }

  item = 1;
  pin2SeenHighSinceBoot = 1;
  invalidateServoHold();
  foldHoldActive = 0;
  lastWrittenAngle = cur;
  forceServoMove = 1;

  writeServoDirect(bianlaing);
  waitBootServoReach(bianlaing);
  forceServoMove = 0;

  if (!isSelfCheckFaultLatched()) {
    servoTrackItem = 1;
    servoTrackAngle = bianlaing;
    if (!openEaseActive) {
      int live = readServoAngleLive();
      if (live >= 0 && live <= 180) lastWrittenAngle = live;
      servoFinalizePosition(bianlaing);
      lastWrittenAngle = bianlaing;
    }
  }
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
  if ((f3HfCfg & 1)) f3ArmFoldCloseWatch();
#endif
  KDBG_KV("BOOT_OPEN_DONE", item, lastWrittenAngle);
}

// 开机下翻：灯亮 + 展开到 bianlaing
static void bootPowerOnOpenDown() {
#if F3_MAX_BUILD
  f3BootLedOn();
#else
  digitalWrite(8, HIGH);
#endif
  KDBG_L("BOOT_POWER_ON_OPEN");
  bootFlapOpenForce();
#if F3_MAX_BUILD
  f3BootLedOn();
#else
  digitalWrite(8, HIGH);
#endif
  statusLedUpdate();
}

// 开机折回：不论当前在哪，先满速折向日常折叠位 item4-10
void bootMoveToFold() {
#if F3_MAX_BUILD
  bootMoveToTarget(f3FoldUserTarget(), 0);
#else
  bootMoveToTarget(item4, 0);
#endif
}

void setup() {
  MCUSR = 0;
  wdt_disable();

#if F2_MOTION_A0_DEBUG || F2_KEY_SERIAL_DEBUG || F3_SENSOR_SERIAL || F3_BLE_CMD_DEBUG || F3_BLE_RX_USB_DEBUG
  Serial.begin(9600);
#if F3_BLE_RX_USB_DEBUG
  Serial.println(F("USB RX DEBUG: D6 raw bytes, BLE=115200"));
#endif
#if F3_BLE_CMD_DEBUG
  Serial.println(F("[F3] USB debug 9600 BLE=115200"));
#endif
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
  powerOnFlip = 0;
  stuckCount = 0;
  openStartMs = 0;
  reboundWaitUntil = 0;
  reboundAttempt = 0;
  reboundFaultLatched = 0;
  pendingFaultReport = 0;
  lastStatusSend = 0;
  selfCheckStartMs = 0;
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
  userServoSpeed = SERVO_SPEED_DEFAULT_PCT;
  stealthElapsedMin = 0;
  stealthMinuteMark = 0;
  rxLen = 0;

  pinMode(8, OUTPUT);
  pinMode(F3_PIN_LED_GREEN, OUTPUT);
  digitalWrite(F3_PIN_LED_GREEN, LOW);
  pinMode(12, OUTPUT);
  digitalWrite(12, LOW); // D12 工作灯：高电平亮（AO3402 低端）
#if F3_HEIGHT_ENABLE
  f3LoadHeightFromEeprom();
#endif
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
  // 未配置脏值默认开堵转
  if (stallDetectOn > 1) {
    stallDetectOn = 1;
    EEPROM.put(29, stallDetectOn);
  }
#if F3_MAX_BUILD
  EEPROM.get(F3_EE_PWR_LOCK, f3PowerOffLockOn);
  if (f3PowerOffLockOn > 1) f3PowerOffLockOn = 0;
#endif
  EEPROM.get(25, userServoSpeed);
  if (userServoSpeed < SERVO_SPEED_MIN_PCT || userServoSpeed > SERVO_SPEED_MAX_PCT) {
    userServoSpeed = SERVO_SPEED_DEFAULT_PCT;
    EEPROM.put(25, userServoSpeed);
  }
  loadPendingFaultReportFromEeprom();
  // 冷启动一律清除历史待上报故障（避免误报残留）；当次上电故障仍走 RAM 锁定
  clearPendingFaultReport();
  reboundFaultLatched = 0;
  reboundAttempt = 0;
  reboundWaitUntil = 0;
  clearOpenMonitor();
  EEPROM.get(28, stealthBtnExitOn);
  if (stealthBtnExitOn != 0 && stealthBtnExitOn != 1) {
    stealthBtnExitOn = 1;
    EEPROM.put(28, stealthBtnExitOn);
  }

  if (bianlaing < 0 || bianlaing > 180) {
    bianlaing = 80;
    EEPROM.put(1, bianlaing);
  }

  KDBG_KV("SETUP", powerOnFlip, accRetractOn);
  KDBG_KV("SETUP_ANG", bianlaing, item4);
  KDBG_KV("SETUP_PIN2", digitalRead(2), selfCheckOn);

  uint8_t bootStealthRestore = 0;
#if F3_MAX_BUILD
  bootStealthRestore = stealthPersistLoad();
#endif

  // 开机定位+自检期间屏蔽 2 号关钥匙收回（waitServoSettle 里会跑 tickStealthKeyWindow）
  bootSettleUntil = millis() + BOOT_SETTLE_MS + 16000UL;
  KDBG_L("BOOT_GUARD_ON");
  watchdogBegin();

  // 上电先稳压 + 指示灯，再发开机目标角
  bootPwrSettleWait();

  if (bootStealthRestore) {
    item = 3;
    stealthActive = 1;
    stealthElapsedMin = 0;
    stealthMinuteMark = millis();
    foldHoldActive = 1;
    forceServoMove = 0;
    openEaseActive = 0;
    invalidateServoHold();
    servoStopHold();
    servoMotionOff();
    servoPwmOff = 1;
    bootStallEn = 0;
    KDBG_L("BOOT_STEALTH_RESTORE");
  } else {
    {
      uint8_t rk = keyOnRstMk;
      uint8_t keyRst = (rk == 0xA5 || rk == 0xA7);
      if (keyRst) keyOnRstMk = 0;
      // 隐蔽退出软复位(0xA7)不开开机堵转；其余上电/开钥匙复位都开
      bootStallEn = (!(keyRst && rk == 0xA7) && userServoSpeed >= SERVO_SPEED_MAX_PCT);
      if (keyRst || powerOnFlip == 0) {
        bootMoveToFold();
      } else {
        bootBlinkFoldBootPrompt();
        bootPowerOnOpenDown();
      }
    }
    bootStallFinish();
  }

  statusLedUpdate();

  releasePin9KeyOffHold();
  pendingKeyOffFold = 0;
  bootSettleUntil = millis() + BOOT_SETTLE_MS;
  KDBG_KV("SETUP_DONE", item, digitalRead(2));
  KDBG_L("BOOT_GUARD_OFF");

  btn5Init();

  f3SensorInit();
#if F3_IMU_ENABLE
  f3ImuInit();
#endif
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
  if (item == 1 && (f3HfCfg & 1)) f3ArmFoldCloseWatch();
#endif

  if (bootStealthRestore) {
    digitalWrite(9, LOW);
  } else {
    digitalWrite(9, HIGH);
  }
  updatePin9Power();
}

void loop() {
  watchdogFeed();
  pollBleSerial();
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
  if (f3HeightCfgModeActive()) {
    for (uint8_t i = 0; i < 4; i++) {
      pollBleSerial();
      if (!mySerial.available()) break;
    }
    f3HeightCfgModeLedApply();
    f3SensorRecoverTick();
    f3SensorServiceTick();
    updatePin9Power();
    tickServoPwmHold();
    if (item == 0 || item == 1) updateServoOutput();
    {
      static unsigned long lastCfgStatusMs = 0;
      unsigned long nowCfg = millis();
      if (nowCfg - lastCfgStatusMs >= F3_CFG_HGT_BLE_MS) {
        lastCfgStatusMs = nowCfg;
        f3ForceStatusOnce = 1;
        sendStatusPacket();
      }
    }
    watchdogFeed();
    return;
  }
#endif
  btn5ServiceTick();
  pollBleSerial();
  tickStealthKeyWindow();
  tickKeyOffServoIdlePwm();
  updatePin9Power();
  tickPin9PowerWatchdog();

  f3SensorRecoverTick();
  f3SensorServiceTick();
#if F3_IMU_ENABLE
  f3ImuServiceTick();
#endif

  if (item == 3) {
    if (!servoPwmOff) servoStopHold();
    tickStealthMinute();
    statusLedUpdate();
    tickFaultAlarm();
    digitalWrite(12, LOW); // 隐蔽：照明灯强制关
    sendStatusPacket();
    return;
  }

  if (pendingKeyOffFold && keyOffRetractEnabled() && keyOffRetractEligible() &&
      item != 0 && item != 3 && !inBootSettle() && !autoLevelBusy) {
    KDBG_L("PENDING_KEY_OFF_FOLD");
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

  if (item == 0 || item == 1) {
    updateServoOutput();
  }
  // D12 照明灯（可小程序手动开关）
  f3WorkLightApply();

  tickAccRetractJudge();
  tickKeyOffRetractDone();
}

/* =============================================================================
 * BLOCK: MPU6050 姿态显示 / 扶正+倾斜标定 / 过坑+骑行震动 / 照明灯
 *   CL/CU  L1/L0/LA  BS0..BS10  BK
 *   震动：固定门槛约 0.01，参与骑行判定，无需 CV 标定
 *   状态：|MOK| |IMS| |IRD| |IEV| |BS| |SS|
 * ============================================================================= */
#if F3_IMU_ENABLE

static const uint8_t F3_EE_IMU_MAGIC = 40;
static const uint8_t F3_EE_IMU_MAGIC_VAL = 0xB4; // B4：碰胎 SP 可下发
static const uint8_t F3_EE_IMU_MAGIC_B3 = 0xB3;
static const uint8_t F3_EE_IMU_MAGIC_B2 = 0xB2;
static const uint8_t F3_EE_IMU_MAGIC_OLD = 0xB1;
static const uint8_t F3_EE_LEAN16 = 41;
static const uint8_t F3_EE_UP16 = 43;
static const uint8_t F3_EE_VIBE16 = 45;
static const uint8_t F3_EE_LIT_MODE = 47;
static const uint8_t F3_EE_GRAV_OK = 48;   // 0xC1=已存扶正重力基准
static const uint8_t F3_EE_SIGN_AXIS = 49;
static const uint8_t F3_EE_GX16 = 50;      // int16 = g*1000
static const uint8_t F3_EE_GY16 = 52;
static const uint8_t F3_EE_GZ16 = 54;
static const uint8_t F3_EE_BUMP_SENS = 60; // 过坑 0更敏 … 10更钝
static const uint8_t F3_EE_STALL_SENS = 61; // 最近预设档 0/1/2
static const uint8_t F3_EE_STALL_OPEN16 = 62;
static const uint8_t F3_EE_STALL_CLOSE16 = 64;
static const uint8_t F3_EE_STALL_HO = 66;
static const uint8_t F3_EE_STALL_HC = 67;
static const uint8_t F3_EE_GRAV_MARK = 0xC1;
static const unsigned long F3_BUMP_HOLD_MS = 500UL; // 过坑红灯/锁键时长

static const float F3_ACC_LSB = 4096.0f;
static const unsigned long F3_IMU_MS = 25UL;          // 略降频，减 I2C 压力
static const uint8_t F3_MPU_MAX_TRIES = 3;
// 震动显示/过坑参考约 0.01；骑行震动辅判门槛
static const uint16_t F3_VIBE_FIXED_X100 = 1;

static uint8_t f3MpuAddr = 0x68;
static uint8_t f3MpuWho = 0;
static uint8_t f3MpuOk = 0;
static int16_t f3LeanX10 = 120;
static int16_t f3UpX10 = 35;
static uint16_t f3VibeX100 = F3_VIBE_FIXED_X100;
static uint8_t f3LitMode = 0;
static uint8_t f3LitOut = 0;

static float f3Gx = 0, f3Gy = 0, f3Gz = 1; // 扶正标定重力（倾角显示用）
static uint8_t f3SignAxis = 0; // 0/1/2：水平向，用于左右符号
static uint8_t f3GravOk = 0;
static float f3AFast = 1, f3ASlow = 1;
static float f3Event = 0;
static float f3RollDeg = 0; // 有符号：+右 / -左（卡尔曼滤波后）
static float f3RollP = 4.f; // 卡尔曼估计方差
// 过坑：与小程序同公式（定点数）；400ms 评估对齐状态包；BK 可被小程序同步触发
static uint16_t f3IevFiltX = 10;   // ×1000
static uint16_t f3IevCruiseX = 10;
static uint16_t f3IevPrevX = 10;
static uint8_t f3IevInited = 0;
static unsigned long f3BumpEvalMs = 0;
static unsigned long f3BumpUntil = 0;
static uint8_t f3BumpSens = 1; // 0更敏 … 10更钝（越大越不灵敏）；默认标准
static uint8_t f3RideOn = 0;
static uint8_t f3RideHits = 0;
static unsigned long f3RideMotionMs = 0;

static uint8_t f3ImuState = 2;
static uint8_t f3ZeroHits = 0;
static unsigned long f3LastImuMs = 0;
static unsigned long f3ImuCoolUntil = 0; // 舵机后冷却，期间禁 I2C

static bool f3MpuWhoOk(uint8_t who) {
  return who == 0x68 || who == 0x70;
}

// 设备未接好 / 舵机掉压时，Arduino Wire 可能永久阻塞 → 整机失控
// 这里不用 Wire，改用带超时的裸 TWI（最长约 3ms/步）
static uint8_t f3TwiWait(uint8_t msMax) {
  unsigned long t0 = millis();
  while (!(TWCR & (1 << TWINT))) {
    if (millis() - t0 >= (unsigned long)msMax) {
      TWCR = 0;
      return 0;
    }
  }
  return 1;
}

static void f3TwiStop() {
  TWCR = (1 << TWINT) | (1 << TWEN) | (1 << TWSTO);
  unsigned long t0 = millis();
  while (TWCR & (1 << TWSTO)) {
    if (millis() - t0 >= 3UL) {
      TWCR = 0;
      break;
    }
  }
}

static uint8_t f3TwiStart() {
  TWCR = (1 << TWINT) | (1 << TWSTA) | (1 << TWEN);
  if (!f3TwiWait(3)) return 0;
  uint8_t s = TWSR & 0xF8;
  return (s == 0x08 || s == 0x10) ? 1 : 0;
}

static uint8_t f3TwiWriteByte(uint8_t data) {
  TWDR = data;
  TWCR = (1 << TWINT) | (1 << TWEN);
  if (!f3TwiWait(3)) return 0;
  uint8_t s = TWSR & 0xF8;
  return (s == 0x18 || s == 0x28 || s == 0x40) ? 1 : 0;
}

static void f3ImuBusClear() {
  TWCR = 0;
  pinMode(SCL, OUTPUT);
  for (uint8_t i = 0; i < 9; i++) {
    digitalWrite(SCL, HIGH);
    delayMicroseconds(4);
    digitalWrite(SCL, LOW);
    delayMicroseconds(4);
  }
  pinMode(SDA, INPUT_PULLUP);
  pinMode(SCL, INPUT_PULLUP);
  TWSR = 0;
  TWBR = ((F_CPU / 100000L) - 16) / 2; // ~100kHz
  TWCR = (1 << TWEN);
}

static uint8_t f3MpuWrite(uint8_t reg, uint8_t val) {
  if (!f3TwiStart()) return 1;
  if (!f3TwiWriteByte((f3MpuAddr << 1) | 0)) { f3TwiStop(); return 1; }
  if (!f3TwiWriteByte(reg)) { f3TwiStop(); return 1; }
  if (!f3TwiWriteByte(val)) { f3TwiStop(); return 1; }
  f3TwiStop();
  return 0;
}

static uint8_t f3MpuRead8(uint8_t reg) {
  if (!f3TwiStart()) return 0xFF;
  if (!f3TwiWriteByte((f3MpuAddr << 1) | 0)) { f3TwiStop(); return 0xFF; }
  if (!f3TwiWriteByte(reg)) { f3TwiStop(); return 0xFF; }
  if (!f3TwiStart()) return 0xFF;
  if (!f3TwiWriteByte((f3MpuAddr << 1) | 1)) { f3TwiStop(); return 0xFF; }
  TWCR = (1 << TWINT) | (1 << TWEN); // NACK last byte
  if (!f3TwiWait(3)) return 0xFF;
  uint8_t v = TWDR;
  f3TwiStop();
  return v;
}

static uint8_t f3MpuReadAccelRaw(int16_t *rx, int16_t *ry, int16_t *rz) {
  uint8_t b[6];
  if (!f3TwiStart()) return 0;
  if (!f3TwiWriteByte((f3MpuAddr << 1) | 0)) { f3TwiStop(); return 0; }
  if (!f3TwiWriteByte(0x3B)) { f3TwiStop(); return 0; }
  if (!f3TwiStart()) return 0;
  if (!f3TwiWriteByte((f3MpuAddr << 1) | 1)) { f3TwiStop(); return 0; }
  for (uint8_t i = 0; i < 6; i++) {
    TWCR = (i < 5)
      ? ((1 << TWINT) | (1 << TWEN) | (1 << TWEA))
      : ((1 << TWINT) | (1 << TWEN));
    if (!f3TwiWait(3)) return 0;
    b[i] = TWDR;
  }
  f3TwiStop();
  *rx = (int16_t)((b[0] << 8) | b[1]);
  *ry = (int16_t)((b[2] << 8) | b[3]);
  *rz = (int16_t)((b[4] << 8) | b[5]);
  return 1;
}

static void f3MpuReadAccel(float *ax, float *ay, float *az) {
  int16_t rx, ry, rz;
  if (!f3MpuReadAccelRaw(&rx, &ry, &rz)) {
    *ax = *ay = *az = 0;
    return;
  }
  *ax = (float)rx / F3_ACC_LSB;
  *ay = (float)ry / F3_ACC_LSB;
  *az = (float)rz / F3_ACC_LSB;
}

static bool f3MpuProbeAddr(uint8_t addr) {
  f3MpuAddr = addr;
  if (!f3TwiStart()) return false;
  uint8_t ack = f3TwiWriteByte((addr << 1) | 0);
  f3TwiStop();
  if (!ack) return false;
  if (f3MpuWrite(0x6B, 0x00) != 0) return false;
  delay(3);
  watchdogFeed();
  uint8_t who = f3MpuRead8(0x75);
  if (!f3MpuWhoOk(who)) return false;
  f3MpuWho = who;
  return true;
}

static bool f3MpuConfigure() {
  if (f3MpuWrite(0x6B, 0x00) != 0) return false;
  delay(3);
  if (f3MpuWrite(0x19, 0x09) != 0) return false;
  if (f3MpuWrite(0x1A, 0x05) != 0) return false;
  if (f3MpuWrite(0x1C, 0x10) != 0) return false;
  uint8_t who = f3MpuRead8(0x75);
  if (!f3MpuWhoOk(who)) return false;
  f3MpuWho = who;
  return true;
}

static void f3ImuSaveMagic();

static void f3StallSaveEeprom() {
  if (f3StallOpenThr < 600) f3StallOpenThr = 600;
  if (f3StallOpenThr > 1023) f3StallOpenThr = 1023;
  if (f3StallCloseThr < 600) f3StallCloseThr = 600;
  if (f3StallCloseThr > 1023) f3StallCloseThr = 1023;
  if (f3StallHitsOpen < 1 || f3StallHitsOpen > 8) f3StallHitsOpen = 3;
  if (f3StallHitsClose < 1 || f3StallHitsClose > 8) f3StallHitsClose = 3;
  EEPROM.put(F3_EE_STALL_OPEN16, f3StallOpenThr);
  EEPROM.put(F3_EE_STALL_CLOSE16, f3StallCloseThr);
  EEPROM.update(F3_EE_STALL_HO, f3StallHitsOpen);
  EEPROM.update(F3_EE_STALL_HC, f3StallHitsClose);
  EEPROM.update(F3_EE_STALL_SENS, f3StallSens);
  f3ImuSaveMagic();
}

static void f3ImuLoadEeprom() {
  uint8_t mag = EEPROM.read(F3_EE_IMU_MAGIC);
  uint8_t known = (mag == F3_EE_IMU_MAGIC_VAL || mag == F3_EE_IMU_MAGIC_B3 ||
                   mag == F3_EE_IMU_MAGIC_B2 || mag == F3_EE_IMU_MAGIC_OLD) ? 1 : 0;
  if (!known) {
    f3LeanX10 = 120;
    f3UpX10 = 35;
    f3VibeX100 = F3_VIBE_FIXED_X100;
    f3LitMode = 0;
    f3BumpSens = 1;
    f3ApplyStallPreset(1);
    return;
  }
  EEPROM.get(F3_EE_LEAN16, f3LeanX10);
  EEPROM.get(F3_EE_UP16, f3UpX10);
  f3VibeX100 = F3_VIBE_FIXED_X100;
  f3LitMode = EEPROM.read(F3_EE_LIT_MODE);
  if (f3LitMode > 2) f3LitMode = 0;
  if (f3LeanX10 < 50) f3LeanX10 = 50;
  if (f3LeanX10 > 450) f3LeanX10 = 450;
  if (f3UpX10 < 0) f3UpX10 = 0;
  if (f3UpX10 > 200) f3UpX10 = 200;
  f3BumpSens = EEPROM.read(F3_EE_BUMP_SENS);
  if (f3BumpSens > 10) f3BumpSens = 1;
  uint8_t ss = EEPROM.read(F3_EE_STALL_SENS);
  f3StallSens = (ss <= 2) ? ss : 1;
  if (mag == F3_EE_IMU_MAGIC_VAL) {
    int16_t o = 0, c = 0;
    EEPROM.get(F3_EE_STALL_OPEN16, o);
    EEPROM.get(F3_EE_STALL_CLOSE16, c);
    uint8_t ho = EEPROM.read(F3_EE_STALL_HO);
    uint8_t hc = EEPROM.read(F3_EE_STALL_HC);
    if (o >= 600 && o <= 1023 && c >= 600 && c <= 1023 && ho >= 1 && ho <= 8 && hc >= 1 && hc <= 8) {
      f3StallOpenThr = o;
      f3StallCloseThr = c;
      f3StallHitsOpen = ho;
      f3StallHitsClose = hc;
      return;
    }
  }
  f3ApplyStallPreset(f3StallSens);
  f3StallSaveEeprom();
}

static void f3ImuSaveMagic() {
  EEPROM.update(F3_EE_IMU_MAGIC, F3_EE_IMU_MAGIC_VAL);
}

static void f3ImuSaveGravEeprom() {
  EEPROM.put(F3_EE_GX16, (int16_t)(f3Gx * 1000.0f));
  EEPROM.put(F3_EE_GY16, (int16_t)(f3Gy * 1000.0f));
  EEPROM.put(F3_EE_GZ16, (int16_t)(f3Gz * 1000.0f));
  EEPROM.update(F3_EE_SIGN_AXIS, f3SignAxis);
  EEPROM.update(F3_EE_GRAV_OK, F3_EE_GRAV_MARK);
}

static uint8_t f3ImuLoadGravEeprom() {
  if (EEPROM.read(F3_EE_GRAV_OK) != F3_EE_GRAV_MARK) return 0;
  int16_t gx = 0, gy = 0, gz = 0;
  EEPROM.get(F3_EE_GX16, gx);
  EEPROM.get(F3_EE_GY16, gy);
  EEPROM.get(F3_EE_GZ16, gz);
  if (gx == 0 && gy == 0 && gz == 0) return 0;
  f3Gx = gx / 1000.0f;
  f3Gy = gy / 1000.0f;
  f3Gz = gz / 1000.0f;
  f3SignAxis = EEPROM.read(F3_EE_SIGN_AXIS);
  if (f3SignAxis > 2) f3SignAxis = 0;
  f3GravOk = 1;
  f3AFast = 1;
  f3ASlow = 1;
  return 1;
}

static void f3ImuCalibrateGravity() {
  int32_t sx = 0, sy = 0, sz = 0;
  const uint8_t N = 4;
  uint8_t ok = 0;
  for (uint8_t i = 0; i < N; i++) {
    int16_t rx, ry, rz;
    if (f3MpuReadAccelRaw(&rx, &ry, &rz)) {
      sx += rx; sy += ry; sz += rz;
      ok++;
    }
    watchdogFeed();
  }
  if (ok < 2) { f3GravOk = 0; return; }
  float fx = (float)sx / (float)ok;
  float fy = (float)sy / (float)ok;
  float fz = (float)sz / (float)ok;
  float n = sqrt(fx * fx + fy * fy + fz * fz);
  if (n < (0.4f * F3_ACC_LSB) || n > (1.8f * F3_ACC_LSB)) {
    f3GravOk = 0;
    return;
  }
  f3Gx = fx / n;
  f3Gy = fy / n;
  f3Gz = fz / n;
  f3SignAxis = 0;
  {
    float m = f3Gx < 0 ? -f3Gx : f3Gx;
    float t = f3Gy < 0 ? -f3Gy : f3Gy;
    if (t < m) { m = t; f3SignAxis = 1; }
    t = f3Gz < 0 ? -f3Gz : f3Gz;
    if (t < m) f3SignAxis = 2;
  }
  f3GravOk = 1;
  f3AFast = 1;
  f3ASlow = 1;
}

static uint8_t f3ImuTryConnectOnce() {
  watchdogFeed();
  if (!f3MpuProbeAddr(0x68)) return 0;
  if (!f3MpuConfigure()) return 0;
  f3MpuOk = 1;
  f3ZeroHits = 0;
  return 1;
}

void f3ImuInit() {
  f3ImuLoadEeprom();
  f3MpuOk = 0;
  f3MpuWho = 0;
  f3GravOk = 0;
  f3VibeX100 = F3_VIBE_FIXED_X100;
  f3ImuCoolUntil = millis() + 600UL;
  f3ImuLoadGravEeprom();

  delay(80);
  watchdogFeed();
  for (uint8_t t = 0; t < F3_MPU_MAX_TRIES && !f3MpuOk; t++) {
    watchdogFeed();
    f3ImuBusClear();
    if (f3ImuTryConnectOnce()) break;
    delay(50);
  }

  f3LastImuMs = millis();
#if F3_IMU_SERIAL
  mySerial.print(F("I "));
  mySerial.print(f3MpuAddr);
  mySerial.print(' ');
  mySerial.print(f3MpuWho);
  mySerial.print(' ');
  mySerial.print(f3MpuOk);
  mySerial.print(' ');
  mySerial.println(f3GravOk);
#endif
}

void f3WorkLightApply() {
  uint8_t on = 0;
  if (item == 3) on = 0;
  else if (f3LitMode == 1) on = 1;
  else if (f3LitMode == 2) on = 0;
  else on = (item == 0) ? 1 : 0;
  f3LitOut = on;
  digitalWrite(12, on ? HIGH : LOW);
}

static float f3CurrentRollDeg(float ax, float ay, float az) {
  float n = sqrt(ax * ax + ay * ay + az * az);
  if (n < 0.3f) return f3RollDeg;
  float ux = ax / n, uy = ay / n, uz = az / n;
  // 符号：G×a；幅角用 asin(|G×a|) 近似，避免拉入庞大的 acos
  float cx = f3Gy * uz - f3Gz * uy;
  float cy = f3Gz * ux - f3Gx * uz;
  float cz = f3Gx * uy - f3Gy * ux;
  float sn = sqrt(cx * cx + cy * cy + cz * cz);
  if (sn > 1.f) sn = 1.f;
  float mag = sn * 57.29578f; // 小角度够用，省 asin 近似代码
  float s = (f3SignAxis == 0) ? cx : ((f3SignAxis == 1) ? cy : cz);
  return (s >= 0.f) ? mag : -mag;
}

// 一维卡尔曼：平滑倾角。
// 旧逻辑在骑行(vibeOn)时 R≈48 且 |新息|>5° 直接丢弃 → 过弯倾角永远钉死在静止偏置（常见 +2~3°）。
static void f3RollKalmanUpdate(float z, uint8_t vibeOn) {
  f3RollP += vibeOn ? 0.55f : 0.08f; // 骑行时允许更快跟踪真实侧倾
  float R = vibeOn ? 8.5f : 4.5f;
  float K = f3RollP / (f3RollP + R);
  float innov = z - f3RollDeg;
  if (vibeOn) {
    float a = innov < 0.f ? -innov : innov;
    // 只挡冲击毛刺；过弯可达几十度，绝不能 5° 就丢弃
    if (a > 60.f) return;
    if (innov > 14.f) innov = 14.f;
    if (innov < -14.f) innov = -14.f;
  }
  f3RollDeg += K * innov;
  f3RollP = (1.f - K) * f3RollP;
  if (f3RollP < 0.2f) f3RollP = 0.2f;
  if (f3RollP > 30.f) f3RollP = 30.f;
}

// 过坑门槛：0更敏 … 10更钝（越大越不灵敏）
static void f3BumpThrParams(uint8_t s, uint16_t &needPct, uint16_t &riseNeed, uint16_t &floorNeed) {
  if (s > 10) s = 1;
  needPct = 220 + (uint16_t)s * 40;   // 220…620
  riseNeed = 16 + (uint16_t)s * 4;    // 16…56
  floorNeed = 32 + (uint16_t)s * 6;   // 32…92（×1000）
}

uint8_t f3BumpFlapLocked() {
  // 堵转/未解锁报警中：过坑红灯与锁键一律停用
  if (faultIndicatorActive()) return 0;
  return (f3BumpUntil != 0 && (long)(millis() - f3BumpUntil) < 0) ? 1 : 0;
}

void f3ImuServiceTick() {
  unsigned long now = millis();
  // 舵机/缓动/自检：彻底禁 I2C，并再冷却一段时间（掉压后总线最容易挂）
  if (flapMotionMoving() || openEaseActive || forceServoMove || autoLevelBusy ||
      flapSettleUntil != 0) {
    f3ImuCoolUntil = now + 500UL;
    f3WorkLightApply();
    return;
  }
  if ((long)(now - f3ImuCoolUntil) < 0) {
    f3WorkLightApply();
    return;
  }

  // 开机/偶发 I2C 失败：超时 TWI 软重连（约 2.5s 一次），不必整机重启
  if (!f3MpuOk) {
    if (now - f3LastImuMs < 2500UL) {
      f3WorkLightApply();
      return;
    }
    f3LastImuMs = now;
    f3ImuTryConnectOnce();
    f3WorkLightApply();
    return;
  }

  if (now - f3LastImuMs < F3_IMU_MS) return;
  f3LastImuMs = now;

  float ax, ay, az;
  f3MpuReadAccel(&ax, &ay, &az);
  if (ax == 0 && ay == 0 && az == 0) {
    if (++f3ZeroHits >= 6) {
      f3MpuOk = 0;
      f3ImuState = 0;
      f3ZeroHits = 0;
      TWCR = 0; // 释放总线，避免后续误用
    }
    f3WorkLightApply();
    return;
  }
  f3ZeroHits = 0;

  if (!f3GravOk) {
    float n = sqrt(ax * ax + ay * ay + az * az);
    if (n < 0.5f || n > 1.6f) {
      f3WorkLightApply();
      return;
    }
    f3Gx = ax / n;
    f3Gy = ay / n;
    f3Gz = az / n;
    f3SignAxis = 0;
    f3GravOk = 1;
    f3AFast = 1;
    f3ASlow = 1;
    }

  float aUp = ax * f3Gx + ay * f3Gy + az * f3Gz;
  f3AFast = f3AFast + 0.28f * (aUp - f3AFast);
  f3ASlow = f3ASlow + 0.015f * (aUp - f3ASlow);
  float ev = f3AFast - f3ASlow;
  if (ev < 0) ev = -ev;
  f3Event = ev;
  // 过坑：故障报警中整段停用（含小程序 BK 同步）
  if (faultIndicatorActive()) {
    f3BumpUntil = 0;
  } else {
    uint16_t evx = (uint16_t)(ev * 1000.0f + 0.5f);
    if (!f3IevInited) {
      f3IevFiltX = f3IevCruiseX = f3IevPrevX = evx;
      f3IevInited = 1;
      f3BumpEvalMs = now;
    } else {
      f3IevFiltX = (uint16_t)((f3IevFiltX * 65UL + evx * 35UL) / 100UL);
    }
    if ((long)(now - f3BumpEvalMs) >= 180L) {
      f3BumpEvalMs = now;
      uint16_t iev = f3IevFiltX;
      int16_t rising = (int16_t)iev - (int16_t)f3IevPrevX;
      uint8_t hold = f3BumpFlapLocked();
      if (!hold) {
        int16_t above = (int16_t)iev - (int16_t)f3IevCruiseX;
        uint8_t ap;
        if (rising >= 12 && above > 0) ap = 1;
        else if (above > 25) ap = f3RideOn ? 10 : 6;
        else if (above < -12) ap = f3RideOn ? 10 : 12;
        else ap = f3RideOn ? 5 : 7;
        f3IevCruiseX = (uint16_t)((f3IevCruiseX * (100U - ap) + iev * ap) / 100U);
      }
      uint16_t cruise = f3IevCruiseX < 8 ? 8 : f3IevCruiseX;
      uint16_t needPct, riseNeed, floorNeed;
      f3BumpThrParams(f3BumpSens, needPct, riseNeed, floorNeed);
      uint16_t need = (uint16_t)((cruise * 155UL) / 100UL);
      if (need < floorNeed) need = floorNeed;
      need = (uint16_t)((need * (unsigned long)needPct) / 100UL);
      // 单次尖峰即触发（过坑冲击短，连续确认会漏报）
      if (!hold && iev >= cruise + need && rising >= (int16_t)riseNeed) {
        f3BumpUntil = now + F3_BUMP_HOLD_MS;
      }
      f3IevPrevX = iev;
    }
  }
  // 骑行：震动显示非 0（与 IEV 整数一致：×100 后不为 0）即骑行
  {
    uint8_t moving = (f3IevInited && (f3IevFiltX / 10U) != 0) ? 1 : 0;
    if (moving) {
      if (f3RideHits < 8) f3RideHits++;
      if (f3RideHits >= 2) { // 极短确认，避免单点毛刺
        f3RideOn = 1;
        f3RideMotionMs = now;
      }
    } else {
      if (f3RideHits > 0) f3RideHits--;
      if (f3RideOn && (now - f3RideMotionMs >= 1500UL)) {
        f3RideOn = 0;
        f3RideHits = 0;
      }
    }
  }

  // 倾角：一维卡尔曼（骑行时必须能跟上侧倾，不能把新息锁死）
  {
    uint8_t vibeOn = (f3RideOn || (f3IevInited && (f3IevFiltX / 10U) != 0)) ? 1 : 0;
    float rd = f3CurrentRollDeg(ax, ay, az);
    f3RollKalmanUpdate(rd, vibeOn);
  }

  float leanTh = f3LeanX10 / 10.0f;
  float upTh = f3UpX10 / 10.0f;
  float leanMag = f3RollDeg < 0 ? -f3RollDeg : f3RollDeg;
  uint8_t st = f3ImuState;
  if (f3RideOn) st = 3;
  else if (leanMag >= leanTh) st = 1;
  else if (leanMag <= upTh) st = 2;
  else st = 0;
  f3ImuState = st;
  f3WorkLightApply();
}

void f3ImuAppendStatus(Stream &out) {
  out.print(F("|MOK:")); out.print(f3MpuOk ? 1 : 0);
  out.print(F("|IRD:")); out.print((int)(f3RollDeg * 10.0f));
  out.print(F("|IEV:")); out.print((int)(f3Event * 100.0f));
  out.print(F("|IMS:")); out.print(f3MpuOk ? f3ImuState : 0);
  out.print(F("|BS:")); out.print(f3BumpSens);
}

uint8_t f3ImuTryHandleBleCmd(char *cmd) {
  if (!cmd || !cmd[0]) return 0;
  // BK：小程序检出过坑 → 同步车把红灯锁 2s（故障报警中忽略）
  if (cmd[0] == 'B' && cmd[1] == 'K' && cmd[2] == 0) {
    if (!faultIndicatorActive()) f3BumpUntil = millis() + F3_BUMP_HOLD_MS;
    return 1;
  }
  // BS0..BS10：0更敏 … 10更钝
  if (cmd[0] == 'B' && cmd[1] == 'S') {
    uint8_t v = 255;
    if (cmd[2] >= '0' && cmd[2] <= '9' && cmd[3] == 0) v = (uint8_t)(cmd[2] - '0');
    else if (cmd[2] == '1' && cmd[3] == '0' && cmd[4] == 0) v = 10;
    if (v <= 10) {
      f3BumpSens = v;
      EEPROM.update(F3_EE_BUMP_SENS, f3BumpSens);
      f3ImuSaveMagic();
      return 1;
    }
  }
  // SS0/1/2：写入预设具体数值
  if (cmd[0] == 'S' && cmd[1] == 'S' && cmd[2] >= '0' && cmd[2] <= '2' && cmd[3] == 0) {
    f3ApplyStallPreset((uint8_t)(cmd[2] - '0'));
    f3StallSaveEeprom();
    return 1;
  }
  // SP845,870,3,3：打开门槛,收回门槛,打开次数,收回次数
  if (cmd[0] == 'S' && cmd[1] == 'P' && cmd[2] >= '0' && cmd[2] <= '9') {
    int vals[4];
    uint8_t ni = 0;
    int cur = 0;
    const char *p = cmd + 2;
    for (;;) {
      if (*p >= '0' && *p <= '9') {
        cur = cur * 10 + (*p - '0');
        if (cur > 9999) break;
        p++;
        continue;
      }
      if (ni < 4) vals[ni++] = cur;
      cur = 0;
      if (*p == ',' && ni < 4) { p++; continue; }
      break;
    }
    if (ni == 4 && *p == 0 &&
        vals[0] >= 600 && vals[0] <= 1023 &&
        vals[1] >= 600 && vals[1] <= 1023 &&
        vals[2] >= 1 && vals[2] <= 8 &&
        vals[3] >= 1 && vals[3] <= 8) {
      f3StallOpenThr = (int16_t)vals[0];
      f3StallCloseThr = (int16_t)vals[1];
      f3StallHitsOpen = (uint8_t)vals[2];
      f3StallHitsClose = (uint8_t)vals[3];
      f3StallSaveEeprom();
      return 1;
    }
  }
  if (cmd[0] == 'L' && (cmd[1] == '0' || cmd[1] == '1' || cmd[1] == 'A') && cmd[2] == 0) {
    f3LitMode = (cmd[1] == '1') ? 1 : ((cmd[1] == '0') ? 2 : 0);
    EEPROM.update(F3_EE_LIT_MODE, f3LitMode);
    f3ImuSaveMagic();
    f3WorkLightApply();
    return 1;
  }
  if (cmd[0] == 'C' && cmd[1] == 'L' && cmd[2] == 0) {
    if (!f3MpuOk) { mySerial.println(F("ER:MPU")); return 1; }
    float rm = f3RollDeg < 0 ? -f3RollDeg : f3RollDeg;
    f3LeanX10 = (int16_t)(rm * 10.0f + 0.5f);
    if (f3LeanX10 < f3UpX10 + 20) f3LeanX10 = f3UpX10 + 20;
    EEPROM.put(F3_EE_LEAN16, f3LeanX10);
    f3ImuSaveMagic();
    mySerial.println(F("OK:CL"));
    return 1;
  }
  if (cmd[0] == 'C' && cmd[1] == 'U' && cmd[2] == 0) {
    if (!f3MpuOk) { mySerial.println(F("ER:MPU")); return 1; }
    if (flapMotionMoving() || openEaseActive || forceServoMove) {
      mySerial.println(F("ER:MPU"));
      return 1;
    }
    f3ImuCalibrateGravity();
    if (!f3GravOk) { mySerial.println(F("ER:MPU")); return 1; }
    f3ImuSaveGravEeprom();
    f3RollDeg = 0;
    f3RollP = 4.f;
    f3ImuState = 2;
    f3UpX10 = 35;
    EEPROM.put(F3_EE_UP16, f3UpX10);
    f3ImuSaveMagic();
    mySerial.println(F("OK:CU"));
    return 1;
  }
  return 0;
}

#else
void f3WorkLightApply() {
  digitalWrite(12, (item == 0) ? HIGH : LOW);
}
#endif // F3_IMU_ENABLE

