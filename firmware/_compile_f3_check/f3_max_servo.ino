#include <EEPROM.h>
#include <SoftwareSerial.h>
#include <avr/pgmspace.h>
#include <avr/wdt.h>
#include <string.h>

/*
 * F3 MAX 完整固件 — 在 F2 MAX 固件基础上增加 TF200C（VL53L0X）测高
 * 烧录：ATmega328P（Nano 选 ATmega328P / Old Bootloader，勿选 168）
 * F2 MAX 源文件 firmware/f2-max-servo/f2_max_servo.ino 请勿修改；本文件为独立副本。
 *
 * 测高：绿灯未亮（未翻开、灯灭）时本地测距；翻开后绿灯亮不测。蓝牙 HGT 可慢。
 *
 * F3 MAX 无平滑模式。328P 闪存紧张，默认 F3_FLASH_TIGHT。
 */

#define F3_MAX_BUILD 1
#define F3_FLASH_TIGHT 1   // 1=省闪存可烧录；0=完整调试（可能 Sketch too big）
#define F3_SENSOR_SERIAL 0 // 1=Mixly串口打印测高（约+200B，328P 易超限）
#define F3_HEIGHT_ENABLE 1 // 0=完全关闭测高（排查卡死时先改 0 试）
#define F3_BLE_CMD_DEBUG 0 // 1=USB串口9600打印蓝牙命令（+约1.5KB，328P超限勿开）

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
#define F2_BLE_STATUS 1
#endif

#include <Wire.h>
#include "VL53L0X.h"

// ========== BLOCK: F3 TF200C 测高（VL53L0X）==========
const uint8_t F3_PIN_XSHUT = 4;
const unsigned int F3_SENSOR_POLL_MS = 50;   // 本地读距（跟连续测距 ~80ms 对齐，机器侧要快）
const unsigned long F3_HGT_BLE_MS = 1000UL; // 蓝牙 HGT 上报周期（可慢，减串口负载）
const unsigned long F3_CFG_HGT_BLE_MS = 400UL; // 配置模式略快，标定实时高度跟手
const uint16_t F3_HEIGHT_MM_MIN = 10;
const uint16_t F3_HEIGHT_MM_MAX = 3000;
const uint8_t F3_PIN_LED_GREEN = 10;
const uint8_t F3_EEPROM_MAGIC_ADDR = 38;
const uint8_t F3_EEPROM_MAGIC = 0xA7;

#if !F3_FLASH_TIGHT
static void f3ConfigureLongRange() {
  f3Tof.setSignalRateLimit(0.1);
  f3Tof.setVcselPulsePeriod(VL53L0X::VcselPeriodPreRange, 18);
  f3Tof.setVcselPulsePeriod(VL53L0X::VcselPeriodFinalRange, 14);
  f3Tof.setMeasurementTimingBudget(33000);
}
#endif

const uint8_t F3_MEDIAN_WIN = 3;
const uint8_t F3_EMA_NEW = 2;
const uint8_t F3_EMA_OLD = 3;
const uint16_t F3_SNAP_MM = 80;

VL53L0X f3Tof;
uint8_t f3SensorOk = 0;
uint8_t f3FailStreak = 0;
uint16_t f3MedBuf[F3_MEDIAN_WIN];
uint8_t f3MedIdx = 0;
uint8_t f3MedCount = 0;
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
static uint8_t f3AckBlinkHalfLeft = 0;
static unsigned long f3AckBlinkMs = 0;
static uint8_t f3AckGreenOn = 0;
static uint8_t f3ForceStatusOnce = 0;
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
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
extern volatile unsigned long lastStatusSend;
extern volatile int item;
extern volatile int accRetractOn;
extern uint8_t openEaseActive;
extern uint8_t foldAdjustActive;
bool pin2KeyOffStable();

bool f3DangerLedActive();
bool f3OpenBlockedByDanger();
void f3TickDangerLed();
static bool f3HeightCfgModeActive();
static void f3HeightCfgModeLedApply();
static void f3StartGreenAck();
static void f3TickAckBlink();
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

static void f3RecoverSensor() {
  f3FailStreak = 0;
  f3SensorSkipUntil = millis() + 3000UL;
  digitalWrite(F3_PIN_XSHUT, LOW);
  wdt_reset();
  delayWithBlePoll(20);
  digitalWrite(F3_PIN_XSHUT, HIGH);
  delayWithBlePoll(20);
  wdt_reset();
  f3Tof.setTimeout(150);
  f3SensorOk = f3Tof.init() ? 1 : 0;
  if (!f3SensorOk) {
    f3SensorValid = 0;
    return;
  }
  f3Tof.startContinuous(80);
  f3MedCount = 0;
  f3HasFilt = 0;
  f3SensorValid = 0;
}

static bool f3ReadSample(uint16_t &mm) {
  wdt_reset();
  unsigned long t0 = millis();
  mm = f3Tof.readRangeContinuousMillimeters();
  wdt_reset();
  if (millis() - t0 > 400UL || f3Tof.timeoutOccurred() || mm == 0 || mm == 65535) {
    if (++f3FailStreak >= 4) {
      f3RecoverPending = 1;
      f3SensorOk = 0;
      f3SensorValid = 0;
      f3SensorSkipUntil = millis() + 3000UL;
    } else {
      f3SensorSkipUntil = millis() + 800UL;
    }
    return false;
  }
  f3FailStreak = 0;
  return true;
}

static uint16_t f3AbsDiff(uint16_t a, uint16_t b) {
  return (a > b) ? (a - b) : (b - a);
}

static uint16_t f3MedianOfBuffer() {
  uint16_t tmp[F3_MEDIAN_WIN];
  uint8_t n = f3MedCount;
  for (uint8_t i = 0; i < n; i++) tmp[i] = f3MedBuf[i];
  for (uint8_t i = 1; i < n; i++) {
    uint16_t key = tmp[i];
    int8_t j = (int8_t)i - 1;
    while (j >= 0 && tmp[j] > key) {
      tmp[j + 1] = tmp[j];
      j--;
    }
    tmp[j + 1] = key;
  }
  return tmp[n / 2];
}

static uint16_t f3FilterMm(uint16_t rawMm) {
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
  if (f3AbsDiff(med, prev) > F3_SNAP_MM) {
    f3FiltMm = (prev + (uint32_t)med * 4) / 5;
  } else {
    f3FiltMm = (f3FiltMm * F3_EMA_OLD + med * F3_EMA_NEW) / (F3_EMA_OLD + F3_EMA_NEW);
  }
  return (uint16_t)f3FiltMm;
}

void f3SensorInit() {
#if !F3_HEIGHT_ENABLE
  f3SensorOk = 0;
  return;
#endif
  Wire.begin();
  Wire.setClock(100000);
  pinMode(F3_PIN_XSHUT, OUTPUT);
  digitalWrite(F3_PIN_XSHUT, LOW);
  wdt_reset();
  delayWithBlePoll(20);
  digitalWrite(F3_PIN_XSHUT, HIGH);
  delayWithBlePoll(20);
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
  f3Tof.startContinuous(80);
  f3LastPollMs = millis();
}

void f3SensorRecoverTick() {
#if !F3_HEIGHT_ENABLE
  return;
#endif
  if (!f3RecoverPending) return;
  if (!f3HeightMonitorActive()) return;
  f3RecoverPending = 0;
  f3RecoverSensor();
}

void f3SensorServiceTick() {
#if !F3_HEIGHT_ENABLE
  return;
#endif
  if (!f3SensorOk || !f3HeightMonitorActive()) {
    if (item != 0 || flapMotionMoving() || openEaseActive) f3SensorValid = 0;
    return;
  }
  unsigned long now = millis();
  if (now < f3SensorSkipUntil) return;
  if (now - f3LastPollMs < F3_SENSOR_POLL_MS) return;
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
}

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
  f3MarkHeightEepromValid();
}

static bool f3HeightCfgModeActive() {
  return f3HeightCfgMode == 1;
}

/* 厘米整数解析（避免 atof 拉入 float 库，328P 约省 400B+） */
static bool f3ParseHeightCmMm(const char *p, uint16_t &outMm) {
  if (!p || *p < '0' || *p > '9') return false;
  uint16_t cm = 0;
  while (*p >= '0' && *p <= '9') {
    cm = (uint16_t)(cm * 10 + (*p - '0'));
    if (cm > 300) return false;
    p++;
  }
  uint8_t dec = 0;
  if (*p == '.') {
    p++;
    if (*p < '0' || *p > '9') return false;
    dec = (uint8_t)(*p - '0');
    p++;
  }
  if (*p != 0 || cm < 1) return false;
  outMm = (uint16_t)(cm * 10 + dec);
  return outMm >= F3_HEIGHT_MM_MIN && outMm <= F3_HEIGHT_MM_MAX;
}

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
  digitalWrite(F3_PIN_LED_GREEN, LOW);
  digitalWrite(8, HIGH);
#endif
}

static void f3RequestStatusSend() {
  f3ForceStatusOnce = 1;
  lastStatusSend = 0;
}

static void f3StartGreenAck() {
  f3AckBlinkHalfLeft = 4;
  f3AckBlinkMs = 0;
  f3AckGreenOn = 0;
}

static void f3TickAckBlink() {
  if (f3AckBlinkHalfLeft == 0) return;
  unsigned long now = millis();
  if (f3AckBlinkMs != 0 && now - f3AckBlinkMs < 80UL) return;
  f3AckBlinkMs = now;
  f3AckGreenOn = f3AckGreenOn ? 0 : 1;
#if F3_MAX_BUILD
  digitalWrite(8, LOW);
  digitalWrite(F3_PIN_LED_GREEN, f3AckGreenOn ? HIGH : LOW);
#endif
  f3AckBlinkHalfLeft--;
  if (f3AckBlinkHalfLeft == 0) {
    if (f3HeightCfgModeActive()) f3HeightCfgModeLedApply();
    else statusLedUpdate();
  }
}

#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
static void f3SaveHeightAndAck(uint8_t which, uint16_t mm) {
  f3CfgGraceUntil = millis() + 1500UL;
  foldAdjustActive = 0;
  f3CalPreviewActive = 0;
  if (which == 1) f3SaveDangerMm(mm);
  else f3SaveBaseMm(mm);
#if F3_BLE_CMD_DEBUG
  f3DbgNum2(which == 1 ? F("DANGER SAVED mm cfg") : F("BASE SAVED mm cfg"), mm, f3HeightCfgMode);
  f3DbgLine(F("GREEN ACK x2"));
#endif
  f3StartGreenAck();
  f3RequestStatusSend();
  sendStatusPacket();
  drainBleRx();
}

static bool f3TryShortHeightCmd(char *cmd) {
  if (cmd[0] == 'M' && cmd[1] == '1' && cmd[2] == 0) {
    f3HeightCfgMode = 1;
    f3CfgGraceUntil = 0;
    f3HeightCfgModeLedApply();
    drainBleRx();
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
    return true;
  }
  if ((cmd[0] == 'D' || cmd[0] == 'T') && cmd[1] >= '0' && cmd[1] <= '9') {
    if (!f3HeightCfgModeActive()) return false;
    uint16_t mm = 0;
    if (!f3ParseHeightCmMm(cmd + 1, mm)) return false;
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

bool f3DangerLedActive() {
  if (f3HeightCfgModeActive()) return false;
  if ((long)(millis() - f3CfgGraceUntil) < 0) return false;
  if (!f3HeightMonitorActive()) return false;
  if (f3DangerMm == 0) return false;
  if (!f3SensorValid || f3LastFiltMm == 0) return false;
  return f3LastFiltMm <= f3DangerMm;
}

bool f3OpenBlockedByDanger() {
#if !F3_HEIGHT_ENABLE
  return false;
#endif
  return f3DangerLedActive();
}

void f3TickDangerLed() {
  static uint8_t lastDanger = 255;
  uint8_t nowDanger = f3DangerLedActive() ? 1 : 0;
  if (nowDanger != lastDanger) {
    lastDanger = nowDanger;
    statusLedUpdate();
  }
}

#if F3_MAX_BUILD
static void f3WriteLeds(uint8_t redOn, uint8_t greenOn) {
  digitalWrite(8, redOn ? HIGH : LOW);
  digitalWrite(F3_PIN_LED_GREEN, greenOn ? HIGH : LOW);
}

void f3StatusLedUpdate() {
  if (item == 3) {
    if (!faultIndicatorActive()) f3WriteLeds(0, 0);
    return;
  }
  if (faultIndicatorActive()) return;
  if (foldAdjustActive) {
    f3WriteLeds(1, 0);
    return;
  }
  if (pin2KeyOffStable()) {
    if (accRetractOn != 1) {
      f3WriteLeds(0, 0);
      return;
    }
  }
  if (item == 1) {
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
volatile unsigned long openStartMs;
volatile unsigned long reboundWaitUntil;
volatile unsigned long lastStatusSend;
volatile unsigned long selfCheckStartMs;
volatile int reboundStuckCount;
volatile int reboundAttempt;
volatile uint8_t reboundFaultLatched;
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
const unsigned long OPEN_GUARD_MS = 5000UL;
// Pin5 按下后固定 10 秒检测窗（再次按 Pin5 打断并重开）
const unsigned long BTN_DETECT_WINDOW_MS = 10000UL;
const unsigned long BTN_DETECT_SAMPLE_MS = 5UL;
const int BTN_STALL_A0_THR = 860;
const int BTN_STALL_RELEASE_A0_THR = 880;
const int BTN_STALL_HITS_NEED = 10;
const unsigned long MOTOR_MIN_RUN_BEFORE_STALL_MS = 600UL;
const unsigned long REBOUND_RETRY_WAIT_MS = 800UL;
const int STALL_CURRENT_DEFAULT = 860;
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
const int AUTO_LEVEL_FOLD_THR = 900;
const int AUTO_LEVEL_OPEN_THR = 900;
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
const char CMD_DELAY_PWR[] PROGMEM = "\xE5\xBB\xB6\xE6\x97\xB6\xE6\x96\xAD\xE7\x94\xB5";
const char CMD_SPEED[] PROGMEM = "\xE8\xB0\x83\xE9\x80\x9F";
const uint8_t SERVO_SPEED_MIN_PCT = 10;
const uint8_t SERVO_SPEED_MAX_PCT = 100;
const uint8_t SERVO_SPEED_DEFAULT_PCT = 100;
const int DELAY_PWR_MIN_MAX = 10080;

void handleBleCommand(char *cmd);

void foldToRetract();
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
static void keyDbgLine(const __FlashStringHelper *) {}
static void keyDbgKv(const __FlashStringHelper *, int, int = -9999) {}
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
uint8_t forceServoMove = 0;
unsigned long servoPwmHoldUntil = 0;
uint8_t autoLevelBusy = 0;
uint8_t autoLevelDone = 0;
static uint8_t reboundRetryClose = 0;

int lastMotorA0 = -1;
unsigned long lastMotorSampleMs = 0;
unsigned long bootSettleUntil = 0;
unsigned long btnDetectStartMs = 0;
unsigned long flapSettleUntil = 0;

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

void servoPrepareMove() {
  if (item == 3) return;
  servoCancelPwmHold();
  servoMotionOn();
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

static unsigned long flapMoveSettleMs(int fromAngle, int toAngle) {
  unsigned long ms = (unsigned long)abs(toAngle - fromAngle) * 28UL + 400UL;
  if (ms < 400UL) ms = 400UL;
  if (ms > 2500UL) ms = 2500UL;
  return scaleMoveDelayMs((unsigned int)ms);
}

void tickFlapServoHold(int target) {
  if (item != 0 && item != 1) return;

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
    servoWriteEaseStep(target, getUserServoSpeedByte());
    if (start >= 0 && start <= 180) lastWrittenAngle = start;
    servoTrackItem = item;
    servoTrackAngle = target;
    flapSettleUntil = millis() + flapMoveSettleMs(start, target);
    foldHoldActive = 0;
    return;
  }

  if (flapSettleUntil != 0 && (long)(millis() - flapSettleUntil) < 0) {
    if (selfCheckOn == 1 && btnDetectWindowActive()) {
      tickMotionA0Realtime(true);
    }
    return;
  }

  flapSettleUntil = 0;
  if (openEaseActive) return;
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
  if (selfCheckOn == 1 && !reboundFaultLatched) {
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
    watchdogFeed();
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

void drainBleRx() {
  while (mySerial.available()) mySerial.read();
  rxLen = 0;
  rxBuf[0] = 0;
  lastReceiveTime = 0;
}

#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
static bool f3BleCmdValid(const char *cmd) {
  if (!cmd || !cmd[0]) return false;
  if (cmd[0] == 'M' && (cmd[1] == '1' || cmd[1] == '0') && cmd[2] == 0) return true;
  if (cmd[0] == 'F' && cmd[1] == '3' && cmd[2] == 'F' && cmd[4] == 0) {
    return cmd[3] == 'R' || cmd[3] == 'U' || cmd[3] == 'D';
  }
  return (cmd[0] == 'D' || cmd[0] == 'T') && cmd[1] >= '0' && cmd[1] <= '9';
}

static void f3BleDispatchCmd(char *cmd) {
  if (f3HeightCfgModeActive()) {
    if (cmdIsP(cmd, CMD_ADJ_BIG)) {
      f3CalPreviewStep(-1);
      return;
    }
    if (cmdIsP(cmd, CMD_ADJ_SMALL)) {
      f3CalPreviewStep(1);
      return;
    }
    if (!f3BleCmdValid(cmd)) return;
  }
  handleBleCommand(cmd);
}
#else
static void f3BleDispatchCmd(char *cmd) {
  handleBleCommand(cmd);
}
#endif

void pollBleSerial() {
  while (mySerial.available()) {
    int b = mySerial.read();
    if (b < 0) break;
    char c = (char)(b & 0xFF);
    /* 须收 UTF-8 中文指令（调大/调小 等字节 >0x7E），不可只收 ASCII */
    if (c < 0x20) continue;
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
#if F3_BLE_CMD_DEBUG
        f3DbgCmd(F("BLE RX"), rxBuf);
#endif
        f3BleDispatchCmd(rxBuf);
      }
      rxBuf[0] = 0;
      lastReceiveTime = 0;
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
      rxBuf[rxLen] = 0;
      rxLen = 0;
      trimBuf(rxBuf);
      if (rxBuf[0] != 0) f3BleDispatchCmd(rxBuf);
      rxBuf[0] = 0;
      return;
    }
#endif
    rxBuf[rxLen] = 0;
    rxLen = 0;
    trimBuf(rxBuf);
    if (rxBuf[0] == 0) return;
#if F3_BLE_CMD_DEBUG
    f3DbgCmd(F("BLE RX timeout"), rxBuf);
#endif
    f3BleDispatchCmd(rxBuf);
    rxBuf[0] = 0;
  }
}

bool sampleStallDuringOpen();
bool tickMotionA0Realtime(bool forceSample);

bool flapOpenMoving() {
  if (item != 1) return false;
  return openEaseActive || flapSettleUntil != 0 || !servoAtAngle(bianlaing);
}

bool flapCloseMoving() {
  if (item != 0) return false;
  return openEaseActive || flapSettleUntil != 0 || !servoAtAngle(item4);
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

bool f3HeightMonitorActive() {
  if (f3HeightCfgModeActive()) {
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
    /* 预览调角时暂停 I2C 轮询，减轻与舵机动作的负载冲突 */
    if (f3CalPreviewActive) return false;
#endif
    return true;
  }
  if (item != 0 || autoLevelBusy) return false;
  if (flapMotionMoving() || openEaseActive) return false;
  if (faultIndicatorActive() || foldAdjustActive) return false;
  return true;
}

// F3 MAX 只保留堵转检测；未写入 EEPROM 时回退 selfCheckOn。
bool stallCheckActive() {
  if (stallDetectOn == 0 || stallDetectOn == 1) return stallDetectOn == 1;
  return selfCheckOn == 1;
}

bool motionCheckActive() {
  if (keyOffRetractBusy) return false;
  return stallCheckActive();
}

static bool keyOffRetractEnabled() {
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
  singleExec = 0;
  lastMotorSampleMs = 0;
  lastMotorA0 = -1;
}

void restartBtnDetectWindow() {
  btnDetectStartMs = millis();
  openStartMs = btnDetectStartMs;
  selfCheckStartMs = btnDetectStartMs;
  clearBtnDetectSamples();
}

void finishBtnDetectWindow() {
  if (btnDetectStartMs == 0) return;
  btnDetectStartMs = 0;
  openStartMs = 0;
  clearBtnDetectSamples();
}

// Pin5 十秒窗：只做堵转检测。
bool tickMotionA0Realtime(bool forceSample) {
  if (keyOffRetractBusy) return false;
  if (inBootSettle() || autoLevelBusy || reboundFaultLatched) return false;
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

  int a0 = readMotorA0();
  lastMotorA0 = a0;

  if (!stallCheckActive()) {
    debugPrintMotionA0(a0);
    return false;
  }

  if (elapsed < STALL_ARM_MS + MOTOR_MIN_RUN_BEFORE_STALL_MS) {
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
  return OPEN_GUARD_MS;
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
    if (item == 3) {
      cancelKeyOffHoldOnKeyOn();
      updatePin9Power();
    } else {
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
  if (item == 1 || openEaseActive || flapCloseMoving()) {
    requestFlapClose(false);
    return;
  }
  if (item == 0 && !flapPhysicallyAtFold()) {
    requestFlapClose(false);
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
  if (reboundFaultLatched) return true;
  return pendingFaultReport == 2;
}

void statusLedUpdate() {
#if F3_MAX_BUILD
  f3StatusLedUpdate();
  return;
#endif
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
  if (pin2KeyOffStable()) {
    if (accRetractOn != 1) {
      digitalWrite(8, LOW);
      return;
    }
  }
  digitalWrite(8, (item == 1) ? HIGH : LOW);
}

void blinkPin8(uint8_t times, int onMs, int offMs) {
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
  while (!servoMoveCommitted(angle) && !isSelfCheckFaultLatched() && (long)(millis() - deadline) < 0) {
    if (item == 0 || item == 1) updateServoOutput();
    pollBleSerial();
    btn5ServiceTick();
    watchdogFeed();
    tickStealthKeyWindow();
    updatePin9Power();
    delayWithBlePoll(16);
  }
}

// 进入隐蔽前阻塞折回到 item4
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

  writeServoDirect(item4);
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
  int target = (item == 1) ? bianlaing : item4;

#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
  if (f3CalPreviewActive && item == 0) {
    tickFlapServoHold(f3CalPreviewAngle);
    return;
  }
#endif

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
  if (!stallRetry && f3OpenBlockedByDanger()) return;
  if (!stallRetry && !canUserFlapControl()) return;
  if (item == 3 || autoLevelBusy) return;

  abortOpenMotion();
  reboundWaitUntil = 0;
  reboundRetryClose = 0;

  foldAdjustActive = 0;
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
    if (servoTrackItem == 0 && servoTrackAngle == item4) {
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
  abortOpenMotion();
  reboundWaitUntil = 0;
  reboundAttempt = 0;
  reboundStuckCount = 0;
  lastStallSampleMs = 0;
  stealthActive = 0;
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
  reboundFaultLatched = 0;
  clearPendingFaultReport();
}

bool isSelfCheckFaultLatched() {
  if (reboundFaultLatched) return true;
  return pendingFaultReport == 2;
}

// 故障锁定：全速收回（不走平滑），供堵转报错使用
void writeServoFaultFastFold() {
  if (item == 3) return;
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

// 堵转报错：默认快速收回。
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
  Serial.print(F("FAULT LOCK s="));
  Serial.println(reboundFaultLatched);
#endif
}

#if F2_BLE_STATUS
uint8_t getFaultErr() {
  if (reboundFaultLatched || pendingFaultReport == 2) return 2;
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
  out.print(0);
  out.print(F("|CHK:"));
  out.print(selfCheckOn);
  out.print(F("|STD:"));
  out.print(stallCheckActive() ? 1 : 0);
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
  out.print(F("|STM:"));
  if (item == 3 && stealthElapsedMin < STEALTH_AUTO_OFF_MIN) {
    out.print((uint16_t)(STEALTH_AUTO_OFF_MIN - stealthElapsedMin));
  } else {
    out.print(0);
  }
  out.print(F("|STB:"));
  out.print(stealthBtnExitOn ? 1 : 0);
  out.print(F("|SPD:"));
  out.print(userServoSpeed);
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
#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
  if (f3HeightCfgModeActive()) {
    if (!f3ForceStatusOnce) return;
    f3ForceStatusOnce = 0;
  }
#endif
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
  static uint16_t lastHgtSent = 0;
  uint8_t hgtChanged = 0;
  f3BleHgtThisPkt = 0;
  const unsigned long hgtBleMs = f3HeightCfgModeActive() ? F3_CFG_HGT_BLE_MS : F3_HGT_BLE_MS;
  if (f3HeightMonitorActive()) {
    if (now - f3LastHgtBleMs >= hgtBleMs) {
      f3BleHgtThisPkt = 1;
      hgtChanged = (f3SensorOk && f3SensorValid && f3LastFiltMm != lastHgtSent) ? 1 : 0;
      if (!hgtChanged && f3SensorOk && f3SensorValid && f3LastFiltMm > 0) hgtChanged = 1;
      f3LastHgtBleMs = now;
    }
  } else {
    f3LastHgtBleMs = 0;
    lastHgtSent = 0;
  }
  unsigned long minGap = motion ? 350UL : 400UL;
  if (!ioChanged && !itmChanged && !hgtChanged && !heartbeat && err == 0 && wrn == 0 &&
      now - lastStatusSend < minGap) return;
  lastStatusSend = now;
  if (ioChanged) {
    lastAccPin = accPin;
    lastBtnPin = btnPin;
  }
  lastItmSent = itmNow;
  if (hgtChanged) lastHgtSent = f3LastFiltMm;
  int ang;
  if (item == 0 || item == 1) {
    ang = (item == 1) ? bianlaing : item4;
  } else {
    ang = item4;
  }
  printStatusLine(mySerial, ang, accPin, btnPin, err, wrn, false);
  for (uint8_t i = 0; i < 6; i++) pollBleSerial();
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

// 故障报警：堵转确认后慢闪。
void tickFaultAlarm() {
  if (!faultIndicatorActive()) return;
  unsigned long halfMs = FAULT_LED_BLINK_HALF_MS;
  if (reboundFaultLatched) {
    halfMs = MOTION_DETECT_LED_HALF_MS;
  }
#if F3_MAX_BUILD
  digitalWrite(F3_PIN_LED_GREEN, LOW);
#endif
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
static unsigned long btn5LastClickMs = 0;
static uint8_t btn5EnterDone = 0;
static uint8_t btn5SuppressExit = 0;

static bool btn5PinDown() {
  return digitalRead(BTN5_PIN) == LOW;
}

static void btn5ToggleFlap() {
  if (item == 3 || autoLevelBusy) return;
  if (!canUserFlapControl()) return;
  if (item == 0 && f3OpenBlockedByDanger()) return;
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

  unsigned long held = now - btn5DownSince;
  if (!btn5EnterDone && held >= BTN5_ENTER_MS) {
    btn5DoEnterStealth(held);
  } else if (!btn5EnterDone) {
    if (now - btn5LastClickMs >= BTN5_CLICK_MS) {
      btn5LastClickMs = now;
      btn5ToggleFlap();
    }
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

// 自动调平日志（F3_FLASH_TIGHT 关闭以省闪存）
#if F3_FLASH_TIGHT
static inline void autoLevelLogLine(const __FlashStringHelper *) {}
static inline void autoLevelLogScan(int, int, int) {}
static inline void autoLevelLogHit(int, int) {}
static inline void autoLevelLogKV(const __FlashStringHelper *, int) {}
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
    autoLevelLogScan(a, a0, thr);
    if (a0 < thr) {
      autoLevelLogHit(a, a0);
      return a;
    }
  }
  autoLevelLogKV(F("ALOG SCAN end ang="), to);
  return to;
}

#if F3_FLASH_TIGHT
void runAutoLevel() {
  if (autoLevelBusy) {
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
  writeServo(item4);
  waitServoReach(item4);
  blinkPin8(3, 100, 100);
  saveAutoLevelDoneToEeprom();
  autoLevelBusy = 0;
  drainBleRx();
}
#else
void runAutoLevel() {
  if (autoLevelBusy) {
    autoLevelLogLine(F("ALOG skip dup AUTO LEVEL"));
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
  waitServoReach(item4);
  blinkPin8(3, 100, 100);
  autoLevelLogLine(F("ALOG ===== AUTO LEVEL DONE ====="));
  saveAutoLevelDoneToEeprom();
  autoLevelBusy = 0;
  drainBleRx();
}
#endif

static void moveServoToFoldAngle(int angle);

#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
static void f3CalPreviewStep(int delta) {
  if (item == 3) return;
  if (!f3CalPreviewActive) {
    f3CalPreviewActive = 1;
    foldAdjustActive = 1;
    int cur = readServoAngleLive();
    if (cur < 0 || cur > 180) cur = item4;
    f3CalPreviewAngle = cur;
  }
  int next = f3CalPreviewAngle + delta;
  if (next < 0) next = 0;
  if (next > 180) next = 180;
  if (next == f3CalPreviewAngle) return;
  f3CalPreviewAngle = next;
  item = 0;
  foldAdjustActive = 1;
  moveServoToFoldAngle(f3CalPreviewAngle);
  delayWithBlePoll(300);
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
    if (cur < 0 || cur > 180) cur = bianlaing;
  }
  lastWrittenAngle = cur;
  writeServoDirect(angle);
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

#if F3_MAX_BUILD && F3_HEIGHT_ENABLE
  if (f3TryShortHeightCmd(cmd)) return;
  if (f3HeightCfgModeActive()) {
#if F3_BLE_CMD_DEBUG
    f3DbgCmd(F("CFG BLOCK"), cmd);
#endif
    return;
  }
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

  {
    int dpoMin = parseCmdSuffixInt(cmd, CMD_DELAY_PWR);
    if (dpoMin >= 0) {
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
    if (canUserFlapControl() && item != 1 && !f3OpenBlockedByDanger()) {
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

  unsigned long minMoveMs = (unsigned long)abs(target - start) * 28UL + 450UL;
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
#if F2_VARSERVO
      servo.write(target, 255);
#else
      servo.write(target);
#endif
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
  openEaseActive = 0;
  servoCancelPwmHold();
  servoPrepareMove();
  int start = readServoAngleLive();
  if (start < 0 || start > 180) {
    start = (itemState == 1) ? item4 : bianlaing;
  }
  lastWrittenAngle = start;
  forceServoMove = 1;

#if F2_VARSERVO
  servo.write(target, 255);
#else
  servo.write(target);
#endif
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
    digitalWrite(8, HIGH);
    if (bootFoldBlinkDelayPoll((unsigned long)BOOT_FOLD_SLOW_HALF_MS, holdSince)) {
      digitalWrite(8, LOW);
      keyDbgLine(F("BOOT_FOLD_CANCEL"));
      return true;
    }
    digitalWrite(8, LOW);
    if (bootFoldBlinkDelayPoll((unsigned long)BOOT_FOLD_SLOW_HALF_MS, holdSince)) {
      keyDbgLine(F("BOOT_FOLD_CANCEL"));
      return true;
    }
  }
  return false;
}

// 开机下翻展开：不依赖 canUserFlapControl（钥匙可关）
static void bootFlapOpenForce() {
  keyDbgKv(F("BOOT_OPEN_START"), bianlaing, item);
  abortOpenMotion();
  reboundWaitUntil = 0;
  reboundRetryClose = 0;
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

  waitServoReach(bianlaing);
  waitServoSettle(bianlaing);
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
  keyDbgKv(F("BOOT_OPEN_DONE"), item, lastWrittenAngle);
}

// 开机下翻：灯亮 + 展开到 bianlaing
static void bootPowerOnOpenDown() {
  digitalWrite(8, HIGH);
  keyDbgLine(F("BOOT_POWER_ON_OPEN"));
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
  unsigned long deadline = millis() + BTN_DETECT_WINDOW_MS + 500UL;
  while (btnDetectStartMs != 0 && !isSelfCheckFaultLatched()) {
    if ((long)(millis() - deadline) >= 0) {
      finishBtnDetectWindow();
      break;
    }
    watchdogFeed();
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

// 开机下翻：满速转到折叠位 item4 并等到位
void bootMoveToFold() {
  stealthActive = 0;
  bootMoveToTarget(item4, 0);
}

void setup() {
  MCUSR = 0;
  wdt_disable();

#if F2_MOTION_A0_DEBUG || F2_KEY_SERIAL_DEBUG || F3_SENSOR_SERIAL || F3_BLE_CMD_DEBUG
  Serial.begin(9600);
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
  timeout = 500;
  y = 0;
  selfCheckOn = 0;
  p = 0;
  powerOnFlip = 0;
  isRunning = 0;
  stuckCount = 0;
  singleExec = 0;
  openStartMs = 0;
  reboundWaitUntil = 0;
  reboundAttempt = 0;
  reboundStuckCount = 0;
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
  stealthElapsedMin = 0;
  stealthMinuteMark = 0;
  rxLen = 0;

  pinMode(8, OUTPUT);
  pinMode(F3_PIN_LED_GREEN, OUTPUT);
  digitalWrite(F3_PIN_LED_GREEN, LOW);
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
  loadJudgeValFromEeprom();
  EEPROM.get(15, delayPowerOffMin);
  if (delayPowerOffMin < 0 || delayPowerOffMin > DELAY_PWR_MIN_MAX) {
    delayPowerOffMin = 0;
    EEPROM.put(15, delayPowerOffMin);
  }
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

  if (powerOnFlip == 0) {
    // 折回（界面左）：不闪，直接折回
    keyDbgLine(F("BOOT_FOLD_START"));
    bootMoveToFold();
    keyDbgKv(F("BOOT_FOLD_DONE"), item, lastWrittenAngle);
  } else {
    // 下翻（界面右）：慢闪 5 次 → 灯常亮 → 开机下翻展开
    keyDbgLine(F("BOOT_FOLD_PROMPT"));
    bootBlinkFoldBootPrompt();
    bootPowerOnOpenDown();
  }

  statusLedUpdate();

  releasePin9KeyOffHold();
  pendingKeyOffFold = 0;
  bootSettleUntil = millis() + BOOT_SETTLE_MS;
  keyDbgKv(F("SETUP_DONE"), item, digitalRead(2));
  keyDbgLine(F("BOOT_GUARD_OFF"));

  btn5Init();

  f3SensorInit();

  digitalWrite(9, HIGH);
  updatePin9Power();
  watchdogBegin();
}

void loop() {
  watchdogFeed();
  pollBleSerial();
  if (f3HeightCfgModeActive()) {
    for (uint8_t i = 0; i < 4; i++) {
      pollBleSerial();
      if (!mySerial.available()) break;
    }
    f3TickAckBlink();
    if (f3AckBlinkHalfLeft == 0) f3HeightCfgModeLedApply();
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
  f3SensorRecoverTick();
  f3SensorServiceTick();
  pollBleSerial();
  btn5ServiceTick();
  tickStealthKeyWindow();
  tickKeyOffServoIdlePwm();
  updatePin9Power();
  tickPin9PowerWatchdog();

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
