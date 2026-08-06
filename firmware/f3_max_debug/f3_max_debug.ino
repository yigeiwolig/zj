/*
 * F3 MAX 调试程序（测高专用）
 * --------------------------------
 * 只做：VL53L0X 读距 → 滤波 → 蓝牙发小程序看数
 * 小程序可发 TQ0~TQ3 切换弱反射灵敏度档位（到车旁实测用）
 *
 * 烧录：ATmega328P（Nano / Old Bootloader）
 * 蓝牙：D6=RX D7=TX，115200
 *
 * 命令（小程序一键发送）：
 *   TQ0  短  · 门限高
 *   TQ1  中  · 默认
 *   TQ2  长  · 黑橡胶试这个（积分拉长）
 *   TQ3  超长 · 再慢一档做对比
 *
 * Mixly 精简库没有 setMeasurementTimingBudget，用寄存器把 FinalRange 超时拉长做测试。
 */

#include <Wire.h>
#include <SoftwareSerial.h>
#include <avr/wdt.h>
#include <string.h>

// 调试程序用完整 VL53 API（弱反射 timing / VCSEL 可调）
// 注意：Mixly 全局库 VL53L0X 为精简版，仅支持 setSignalRateLimit；见 configureSensorParams()
#include "VL53L0X.h"

const uint16_t HGT_MIN = 10;
const uint16_t HGT_MAX = 3000;
const uint8_t FAIL_STREAK_RECOVER = 8;
const uint8_t MED_WIN = 5;
const uint8_t EMA_NEW = 2;
const uint8_t EMA_OLD = 3;
const unsigned long BLE_MS = 200UL;
const unsigned int POLL_BASE_MS = 55;

SoftwareSerial ble(6, 7);
VL53L0X tof;

uint8_t sensorOk = 0;
uint8_t sensorValid = 0;
uint8_t failStreak = 0;
uint8_t recoverPending = 0;
uint8_t tofPreset = 1; // 默认 TQ1

uint16_t sigRateQ97 = 6;
uint32_t timingBudgetUs = 50000UL;   // 上报用（目标积分，us）
uint32_t contPeriodMs = 120UL;
uint16_t ioTimeoutMs = 500;
uint16_t finalTimeoutMacrop = 0;     // 0=不改寄存器；非0=拉长 FinalRange
uint32_t readWaitLimitMs = 800UL;

uint16_t medBuf[MED_WIN];
uint8_t medIdx = 0;
uint8_t medCount = 0;
uint32_t filtMm = 0;
uint8_t hasFilt = 0;

uint16_t lastRawMm = 0;
uint16_t lastFiltMm = 0;
unsigned long lastPollMs = 0;
unsigned long lastBleMs = 0;
unsigned long skipUntil = 0;

#define RX_MAX 24
char rxBuf[RX_MAX];
uint8_t rxLen = 0;
unsigned long rxLastMs = 0;

static uint16_t medianOfBuf() {
  uint16_t tmp[MED_WIN];
  uint8_t n = medCount;
  if (n == 0) return 0;
  for (uint8_t i = 0; i < n; i++) tmp[i] = medBuf[i];
  for (uint8_t i = 0; i < n; i++) {
    for (uint8_t j = i + 1; j < n; j++) {
      if (tmp[j] < tmp[i]) {
        uint16_t t = tmp[i];
        tmp[i] = tmp[j];
        tmp[j] = t;
      }
    }
  }
  return tmp[n / 2];
}

static uint16_t filterMm(uint16_t raw) {
  medBuf[medIdx] = raw;
  medIdx = (medIdx + 1) % MED_WIN;
  if (medCount < MED_WIN) medCount++;
  uint16_t med = medianOfBuf();
  if (!hasFilt) {
    filtMm = med;
    hasFilt = 1;
    return med;
  }
  filtMm = (filtMm * EMA_OLD + (uint32_t)med * EMA_NEW) / (EMA_OLD + EMA_NEW);
  return (uint16_t)filtMm;
}

static void applyPreset(uint8_t q) {
  if (q > 3) q = 3;
  tofPreset = q;
  // 注意：单次读距不可接近/超过 WDT，否则切档会复位回 TQ1
  switch (q) {
    case 0: // 短 · 快
      sigRateQ97 = 13;
      timingBudgetUs = 33000UL;
      contPeriodMs = 50UL;
      ioTimeoutMs = 300;
      finalTimeoutMacrop = 0;
      readWaitLimitMs = 500UL;
      break;
    case 2: // 长 · 弱反射（门限低 + 略加长，仍远小于 WDT）
      sigRateQ97 = 2;
      timingBudgetUs = 200000UL;
      contPeriodMs = 220UL;
      ioTimeoutMs = 800;
      finalTimeoutMacrop = 0x08E0;
      readWaitLimitMs = 1200UL;
      break;
    case 3: // 超长 · 再慢一档（上限约 300ms 级，避免看门狗复位）
      sigRateQ97 = 1;
      timingBudgetUs = 300000UL;
      contPeriodMs = 320UL;
      ioTimeoutMs = 1200;
      finalTimeoutMacrop = 0x0A80;
      readWaitLimitMs = 1800UL;
      break;
    default: // TQ1 中 · 默认
      sigRateQ97 = 6;
      timingBudgetUs = 100000UL;
      contPeriodMs = 150UL;
      ioTimeoutMs = 600;
      finalTimeoutMacrop = 0x04D0;
      readWaitLimitMs = 900UL;
      break;
  }
}

// Mixly 精简库：用公开 writeReg / writeReg16Bit 拉长单次测距时间
static void applyLongIntegrationRegs() {
  // Long-range 风格 VCSEL（与 Pololu 长距示例一致）
  tof.writeReg(VL53L0X::PRE_RANGE_CONFIG_VCSEL_PERIOD, 0x08);   // 18
  tof.writeReg(VL53L0X::FINAL_RANGE_CONFIG_VCSEL_PERIOD, 0x06); // 14
  if (finalTimeoutMacrop != 0) {
    tof.writeReg16Bit(VL53L0X::FINAL_RANGE_CONFIG_TIMEOUT_MACROP_HI, finalTimeoutMacrop);
  }
}

static void configureSensorParams() {
  tof.setTimeout(ioTimeoutMs);
  tof.setSignalRateLimit(sigRateQ97);
  applyLongIntegrationRegs();
}

static bool initSensor() {
  tof.setTimeout(ioTimeoutMs);
  if (!tof.init()) {
    sensorOk = 0;
    sensorValid = 0;
    return false;
  }
  configureSensorParams();
  tof.startContinuous(contPeriodMs);
  sensorOk = 1;
  medCount = 0;
  medIdx = 0;
  hasFilt = 0;
  sensorValid = 0;
  failStreak = 0;
  lastRawMm = 0;
  lastFiltMm = 0;
  skipUntil = millis() + 500UL;
  return true;
}

static void recoverSensor() {
  wdt_reset();
  if (!initSensor()) {
    recoverPending = 1;
    skipUntil = millis() + 2000UL;
  }
}

static bool readSample(uint16_t &mm) {
  wdt_reset();
  unsigned long t0 = millis();
  mm = tof.readRangeContinuousMillimeters();
  wdt_reset();
  bool bad = (millis() - t0 > readWaitLimitMs)
    || tof.timeoutOccurred()
    || mm == 0
    || mm == 65535
    || mm > HGT_MAX;
  if (bad) {
    if (++failStreak >= FAIL_STREAK_RECOVER) {
      recoverPending = 1;
      sensorValid = 0;
      skipUntil = millis() + 1200UL;
    } else {
      skipUntil = millis() + 180UL;
    }
    return false;
  }
  failStreak = 0;
  if (mm < HGT_MIN) mm = HGT_MIN;
  return true;
}

static void serviceSensor() {
  if (recoverPending) {
    if ((long)(millis() - skipUntil) >= 0) {
      recoverPending = 0;
      recoverSensor();
    }
    return;
  }
  if (!sensorOk) return;
  unsigned long now = millis();
  if (now < skipUntil) return;
  unsigned int pollMs = (unsigned int)contPeriodMs;
  if (pollMs < POLL_BASE_MS) pollMs = POLL_BASE_MS;
  if (now - lastPollMs < pollMs) return;
  lastPollMs = now;

  uint16_t raw = 0;
  if (!readSample(raw)) {
    sensorValid = 0;
    return;
  }
  lastRawMm = raw;
  lastFiltMm = filterMm(raw);
  sensorValid = 1;
}

// Mixly 精简库无 stopContinuous：用寄存器停连续测距
static void stopTofContinuous() {
  tof.writeReg(VL53L0X::SYSRANGE_START, 0x01);
  tof.writeReg(0xFF, 0x01);
  tof.writeReg(0x00, 0x00);
  tof.writeReg(0x91, 0x00);
  tof.writeReg(0x00, 0x01);
  tof.writeReg(0xFF, 0x00);
}

static void reapplyAfterPreset() {
  if (!sensorOk) {
    recoverPending = 1;
    skipUntil = millis();
    return;
  }
  wdt_reset();
  stopTofContinuous();
  delay(20);
  wdt_reset();
  configureSensorParams();
  tof.startContinuous(contPeriodMs);
  hasFilt = 0;
  medCount = 0;
  medIdx = 0;
  sensorValid = 0;
  failStreak = 0;
  skipUntil = millis() + 400UL;
}

static void handleCmd(char *cmd) {
  if (!cmd || !cmd[0]) return;
  // 去尾部空白 / F3 习惯尾部 #
  uint8_t n = strlen(cmd);
  while (n > 0 && (cmd[n - 1] == '\r' || cmd[n - 1] == '\n' || cmd[n - 1] == ' ' || cmd[n - 1] == '#')) {
    cmd[--n] = 0;
  }
  if (n == 0) return;

  if (cmd[0] == 'T' && cmd[1] == 'Q' && cmd[2] >= '0' && cmd[2] <= '3' && cmd[3] == 0) {
    applyPreset((uint8_t)(cmd[2] - '0'));
    // 先回 OK，再改传感器：避免切档卡死时小程序永远看不到确认
    ble.print(F("OK:TQ"));
    ble.println(tofPreset);
    Serial.print(F("OK:TQ"));
    Serial.println(tofPreset);
    reapplyAfterPreset();
    return;
  }

  // 未知指令：静默忽略（避免小程序把 ER: 和状态 ERR: 搞混）
  Serial.print(F("IGN:"));
  Serial.println(cmd);
}

static void pollBleRx() {
  while (ble.available()) {
    char c = (char)ble.read();
    rxLastMs = millis();
    if (c == '\n' || c == '\r') {
      if (rxLen > 0) {
        rxBuf[rxLen] = 0;
        handleCmd(rxBuf);
        rxLen = 0;
      }
      continue;
    }
    if (rxLen < RX_MAX - 1) rxBuf[rxLen++] = c;
    else rxLen = 0;
  }
  if (rxLen > 0 && (millis() - rxLastMs) > 80UL) {
    rxBuf[rxLen] = 0;
    handleCmd(rxBuf);
    rxLen = 0;
  }
}

static void sendBleStatus() {
  unsigned long now = millis();
  if (now - lastBleMs < BLE_MS) return;
  lastBleMs = now;

  uint16_t hgt = (sensorOk && sensorValid && lastFiltMm > 0) ? lastFiltMm : 0;
  uint16_t hrw = (sensorOk && sensorValid && lastRawMm > 0) ? lastRawMm : 0;
  // TTB：目标积分时间(ms)，方便小程序看「时间拉了多长」
  uint16_t ttbMs = (uint16_t)(timingBudgetUs / 1000UL);
  if (ttbMs == 0) ttbMs = (uint16_t)contPeriodMs;

  ble.print(F("ANG:0|ACC:0|BTN:0|ITM:0|STD:0|RET:0|PWR:0|ERR:0|WRN:0|HGT:"));
  ble.print(hgt);
  ble.print(F("|HRW:"));
  ble.print(hrw);
  ble.print(F("|TQ:"));
  ble.print(tofPreset);
  ble.print(F("|TSR:"));
  ble.print(sigRateQ97);
  ble.print(F("|TTB:"));
  ble.print(ttbMs);
  ble.print(F("|HF:1|F3C:0|DGA:0|DGB:0|DGD:0"));
  ble.println();

  Serial.print(F("RAW:"));
  Serial.print(lastRawMm);
  Serial.print(F(" FILT:"));
  Serial.print(lastFiltMm);
  Serial.print(F(" TQ:"));
  Serial.print(tofPreset);
  Serial.print(F(" TSR:"));
  Serial.print(sigRateQ97);
  Serial.print(F(" TTB:"));
  Serial.print(ttbMs);
  Serial.print(F(" VAL:"));
  Serial.println(sensorValid);
}

void setup() {
  // 切 TQ2/TQ3 时读距偏长；4s 看门狗会把板子打回默认 TQ1
  wdt_enable(WDTO_8S);
  Serial.begin(115200);
  ble.begin(115200);
  Wire.begin();
  Wire.setClock(100000);
  delay(80);
  wdt_reset();

  applyPreset(1);
  Serial.println(F("F3 MAX DEBUG height+TQ"));
  if (initSensor()) {
    Serial.println(F("TOF OK TQ1"));
  } else {
    Serial.println(F("TOF FAIL"));
    recoverPending = 1;
    skipUntil = millis() + 1500UL;
  }
  ble.println(F("ANG:0|ITM:0|HGT:0|HRW:0|TQ:1|TSR:6|TTB:50|HF:1"));
}

void loop() {
  wdt_reset();
  pollBleRx();
  serviceSensor();
  sendBleStatus();
}
