/**
 * MT-CAN-Learn 双模式固件
 * 模式1 STREAM：上电无配置 / 采集阶段 — BLE 转发 CAN
 * 模式2 RUNTIME：收到 set_runtime 后 — 灯带 + BLE 上报小程序（num_leds 可配置）
 */
#include <Arduino.h>
#include <FastLED.h>
#include <NimBLEDevice.h>
#include <Preferences.h>
#include <driver/twai.h>
#include <map>
#include <CanLearnCore.h>

#define MAX_LEDS 300
#define DEFAULT_NUM_LEDS 30
#define LED_PIN 3
#define CAN_TX 7
#define CAN_RX 6
#define LED_STEP_MS_RISE 3
#define LED_STEP_MS_FALL 2
#define LED_SNAP_FALL_GAP 64
#define LED_GAP_WATCHDOG_MS 400
#define CAN_BITRATE_PROBE_MS 2000
#define CAN_PASSIVE_FPS_WINDOW_MS 2000
#define CAN_PASSIVE_FPS_MIN 15
#define CAN_PASSIVE_FPS_STREAK 3
#define BTN_PIN 8
/** 250 kbps 索引 */
#define CAN_IDX_250K 1
#define CAN_IDX_500K 0
/** 确认被动广播：非 OBD 帧达到此阈值后切 LISTEN_ONLY */
#define CAN_PASSIVE_CONFIRM_THRESHOLD 20
#define CAN_LOCK_MIN_OBD_ONLY 5
#define BLE_CHUNK 240
#define BLE_CHUNK_DELAY_MS 1
#define BLE_TX_QUEUE_LEN 256
#define BLE_TX_DRAIN_PER_LOOP 20
#define CAN_POLL_BURST 64
#define CAN_RX_QUEUE_LEN 128
#define BLE_TX_BUF_SIZE 1400
#define CAN_POLL_BURST_RUNTIME 256

/** 无实车测试：1=模拟 CAN；实车请保持 0 */
#ifndef SIMULATE_CAN
#define SIMULATE_CAN 0
#endif

enum AppMode { APP_STREAM = 0, APP_RUNTIME = 1 };

static void handleCommand(const String &line);

static float ledLerpAlpha = 0.72f;

static const char *BLE_NAME = "MT-CAN-Learn";
static const char *NUS_SERVICE = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
static const char *NUS_RX = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";
static const char *NUS_TX = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";

Preferences prefs;
static int numLeds = DEFAULT_NUM_LEDS;
CRGB leds[MAX_LEDS];
NimBLECharacteristic *txChar = nullptr;
volatile bool bleConnected = false;
String rxBuffer;
static volatile bool bleSuppressTelemetry = false;
static volatile bool bleCmdPending = false;
static String blePendingCmdLine;

AppMode appMode = APP_STREAM;
RuntimeConfig runtimeCfg;
std::map<uint32_t, uint8_t[8]> liveFrames;

uint32_t lastFlushMs = 0;
float ledDisplayCount = 0;
static int ledDisplayInt = 0;
static int ledTargetInt = 0;
static uint32_t lastLedStepMs = 0;
static uint32_t ledGapSinceMs = 0;
static float lastPaintCount = -1.f;
int runtimeGear = -1;
uint16_t runtimeRpmRaw = 0;
int lastRenderGear = -2;
int lastRenderFull = -1;
float lastRenderPart = -1.f;

/** 灯效：开机白 → 写入逐颗亮 → 匹配蓝闪×5 → 正常跑灯 */
enum LedFxPhase : uint8_t {
  LED_FX_OFF = 0,
  LED_FX_BOOT_WHITE,
  LED_FX_WRITE_SEQUENCE,
  LED_FX_MATCH_BLUE,
  LED_FX_RUNNING
};
static LedFxPhase ledFxPhase = LED_FX_OFF;
static uint8_t ledFxStep = 0;
static uint32_t ledFxLastMs = 0;
static bool runtimeCanCelebrated = false;
static bool runtimeCanSawMatch = false;

#define LED_FX_WRITE_STEP_MS 45
#define LED_FX_WRITE_HOLD_MS 400
#define LED_FX_BLUE_HALF_MS 220
#define LED_FX_BLUE_FLASH_COUNT 5

struct BatchFrame { uint32_t id; uint8_t dlc; uint8_t data[8]; };
static BatchFrame bleTxQueue[BLE_TX_QUEUE_LEN];
static volatile uint16_t bleTxHead = 0;
static volatile uint16_t bleTxTail = 0;
static char bleTxBuf[BLE_TX_BUF_SIZE];

/** 常见 CAN 波特率，按出现频率排序依次探测 */
static const twai_timing_config_t CAN_TIMING_500K = TWAI_TIMING_CONFIG_500KBITS();
static const twai_timing_config_t CAN_TIMING_250K = TWAI_TIMING_CONFIG_250KBITS();
static const twai_timing_config_t CAN_TIMING_1M = TWAI_TIMING_CONFIG_1MBITS();
static const twai_timing_config_t CAN_TIMING_125K = TWAI_TIMING_CONFIG_125KBITS();
static const twai_timing_config_t CAN_TIMING_800K = TWAI_TIMING_CONFIG_800KBITS();
static const twai_timing_config_t *CAN_TIMING_TABLE[] = {
  &CAN_TIMING_500K,  /* 无极、绝大多数欧五摩托、现代汽车 */
  &CAN_TIMING_250K,  /* 部分老款春风、早期 KTM、货车/商用车 */
  &CAN_TIMING_1M,    /* 高性能赛车 ECU、车内高速传感器网络 */
  &CAN_TIMING_125K,  /* 早期舒适系统，摩托车上极少见 */
  &CAN_TIMING_800K,  /* 极个别欧洲方案 */
};
static const char *CAN_KBPS_LABELS[] = { "500", "250", "1000", "125", "800" };
static const uint8_t CAN_BITRATE_COUNT = sizeof(CAN_TIMING_TABLE) / sizeof(CAN_TIMING_TABLE[0]);

static bool canDriverReady = false;
static bool canBitrateLocked = false;
static uint8_t canBitrateIndex = 0;
static uint32_t lastCanRxMs = 0;
static uint32_t lastStatusBleMs = 0;
static uint32_t canRxSessionCount = 0;
static uint32_t lastRuntimeBleMs = 0;
static uint16_t canPassiveFrameCount = 0;
static uint16_t knownVehicleBroadcastCount = 0;
static bool canPassiveBroadcastConfirmed = false;
static uint32_t lastVehicleRxMs = 0;
static uint32_t passiveFpsWinStartMs = 0;
static uint16_t passiveFpsWinCount = 0;
static uint8_t passiveFpsStreak = 0;
static bool btnWasHigh = false;
static uint32_t lastBtnMs = 0;

static const char *vehicleProfileName() { return "wuji"; }

static void loadVehicleProfile() {
  ledLerpAlpha = 0.72f;
  prefs.begin("canlearn", false);
  prefs.putUChar("vehProf", 0);
  prefs.end();
}

static void sendVehicleProfileJson() {
  char buf[128];
  snprintf(buf, sizeof(buf),
           "{\"type\":\"vehicle_profile\",\"profile\":\"wuji\",\"knock\":false,\"led_lerp\":%.2f}",
           ledLerpAlpha);
  bleSendLine(buf);
}

/** 无极：被动监听，从不主动发 CAN */
static bool canNeedsKnock() { return false; }

/** 未锁定前 NORMAL；锁定且确认被动广播后 LISTEN_ONLY */
static twai_mode_t canTwaiMode() {
  if (!canBitrateLocked) return TWAI_MODE_NORMAL;
  if (canPassiveBroadcastConfirmed) return TWAI_MODE_LISTEN_ONLY;
  return TWAI_MODE_NORMAL;
}

static void bleSendRaw(const char *data, size_t len) {
  if (!bleConnected || !txChar || !data || !len) return;
  if (len <= BLE_CHUNK) {
    txChar->setValue((uint8_t *)data, len);
    txChar->notify();
    return;
  }
  for (size_t i = 0; i < len; i += BLE_CHUNK) {
    size_t partLen = len - i;
    if (partLen > BLE_CHUNK) partLen = BLE_CHUNK;
    txChar->setValue((uint8_t *)(data + i), partLen);
    txChar->notify();
    if (i + partLen < len) delay(BLE_CHUNK_DELAY_MS);
  }
}

static void bleSendRaw(const String &msg) { bleSendRaw(msg.c_str(), msg.length()); }

static void bleSendLine(const String &jsonBody) { bleSendRaw(jsonBody + "\n"); }

static void deinitCan() {
  if (!canDriverReady) return;
  twai_stop();
  twai_driver_uninstall();
  canDriverReady = false;
}

static bool startCanAtIndex(uint8_t idx) {
  deinitCan();
  canBitrateIndex = idx % CAN_BITRATE_COUNT;

  if (!canBitrateLocked && !canPassiveBroadcastConfirmed) {
    canPassiveFrameCount = 0;
    knownVehicleBroadcastCount = 0;
  }

  twai_mode_t mode = canTwaiMode();
  twai_general_config_t g = TWAI_GENERAL_CONFIG_DEFAULT((gpio_num_t)CAN_TX, (gpio_num_t)CAN_RX, mode);
  g.rx_queue_len = CAN_RX_QUEUE_LEN;
  twai_timing_config_t t = *CAN_TIMING_TABLE[canBitrateIndex];
  twai_filter_config_t f = TWAI_FILTER_CONFIG_ACCEPT_ALL();
  if (twai_driver_install(&g, &t, &f) != ESP_OK) return false;
  if (twai_start() != ESP_OK) {
    twai_driver_uninstall();
    return false;
  }

  canDriverReady = true;
  if (!canBitrateLocked) lastCanRxMs = millis();
  Serial.printf("[CAN] start %s kbps mode=%s knock=%s\n",
                CAN_KBPS_LABELS[canBitrateIndex],
                mode == TWAI_MODE_NORMAL ? "NORMAL" : "LISTEN",
                canNeedsKnock() ? "ON" : "OFF");
  return true;
}

static bool isObdDiagnosticFrame(uint32_t id, bool extd);
static void notifyCanBitrate(bool locked);

/** 高帧率被动广播后切 LISTEN_ONLY */
static void tickPassiveBroadcastDetect(uint32_t id, bool extd) {
  if (isObdDiagnosticFrame(id, extd) || canPassiveBroadcastConfirmed) return;

  lastVehicleRxMs = millis();
  uint32_t now = lastVehicleRxMs;

  if (passiveFpsWinStartMs == 0) passiveFpsWinStartMs = now;
  passiveFpsWinCount++;

  if (now - passiveFpsWinStartMs < CAN_PASSIVE_FPS_WINDOW_MS) return;

  float fps = (float)passiveFpsWinCount * 1000.f / (float)(now - passiveFpsWinStartMs);
  passiveFpsWinCount = 0;
  passiveFpsWinStartMs = now;

  if (canBitrateIndex == CAN_IDX_500K && fps >= (float)CAN_PASSIVE_FPS_MIN) {
    passiveFpsStreak++;
    Serial.printf("[CAN] passive fps=%.1f streak=%u\n", fps, (unsigned)passiveFpsStreak);
  } else {
    passiveFpsStreak = 0;
  }

  if (passiveFpsStreak >= CAN_PASSIVE_FPS_STREAK) {
    canPassiveBroadcastConfirmed = true;
    startCanAtIndex(canBitrateIndex);
    Serial.printf("[CAN] Wuji high-rate passive (%.1f fps) — knock OFF\n", fps);
    notifyCanBitrate(canBitrateLocked);
  }
}

static void notifyCanBitrate(bool locked) {
  if (!bleConnected) return;
  uint32_t msSince = millis() - lastCanRxMs;
  char buf[160];
  snprintf(buf, sizeof(buf),
           "{\"type\":\"can_bitrate\",\"kbps\":%s,\"index\":%u,\"total\":%u,"
           "\"locked\":%s,\"knock\":%s,\"ms_since_rx\":%u,\"rx_total\":%u}",
           CAN_KBPS_LABELS[canBitrateIndex], (unsigned)canBitrateIndex,
           (unsigned)CAN_BITRATE_COUNT, locked ? "true" : "false",
           canNeedsKnock() ? "true" : "false",
           (unsigned)msSince, (unsigned)canRxSessionCount);
  bleSendLine(buf);
}

static void sendCanStatus() {
  if (!bleConnected) return;
  uint32_t msSince = millis() - lastCanRxMs;
  char buf[192];
  snprintf(buf, sizeof(buf),
           "{\"type\":\"can_status\",\"mode\":\"%s\",\"profile\":\"%s\",\"kbps\":%s,\"index\":%u,"
           "\"locked\":%s,\"probing\":%s,\"knock\":%s,\"ms_since_rx\":%u,"
           "\"ms_since_vehicle\":%u,\"rx_total\":%u}",
           appMode == APP_RUNTIME ? "runtime" : "stream",
           vehicleProfileName(),
           CAN_KBPS_LABELS[canBitrateIndex], (unsigned)canBitrateIndex,
           canBitrateLocked ? "true" : "false",
           canBitrateLocked ? "false" : "true",
           canNeedsKnock() ? "true" : "false",
           (unsigned)msSince,
           (unsigned)(lastVehicleRxMs ? (millis() - lastVehicleRxMs) : msSince),
           (unsigned)canRxSessionCount);
  bleSendLine(buf);
}

static void savePreferredBitrateIndex() {
  prefs.begin("canlearn", false);
  prefs.putUChar("canKbpsIdx", canBitrateIndex);
  prefs.end();
}

static uint8_t loadPreferredBitrateIndex() {
  return CAN_IDX_500K;
}

static void lockCan500k() {
  canBitrateIndex = CAN_IDX_500K;
  canBitrateLocked = true;
  prefs.begin("canlearn", false);
  prefs.putUChar("canKbpsIdx", CAN_IDX_500K);
  prefs.end();
}

/** OBD 诊断帧（含我们敲门后的 0x7E8 应答），不能当作「无极式总线广播」 */
static bool isObdDiagnosticFrame(uint32_t id, bool extd) {
  if (!extd) {
    if (id == 0x7DF) return true;
    if (id >= 0x7E0 && id <= 0x7EF) return true;
    return false;
  }
  if (id >= 0x18DA0000UL && id <= 0x18DBFFFFUL) return true;
  return false;
}

static void onCanPacketReceived(uint32_t id, bool extd) {
  lastCanRxMs = millis();
  canRxSessionCount++;

  if (!isObdDiagnosticFrame(id, extd)) {
    canPassiveFrameCount++;
    if (id == 0x110 || id == 0x220) knownVehicleBroadcastCount++;
    tickPassiveBroadcastDetect(id, extd);
  }

  if (canBitrateLocked) return;

  if (isObdDiagnosticFrame(id, extd) && canPassiveFrameCount == 0
      && canRxSessionCount < CAN_LOCK_MIN_OBD_ONLY) {
    return;
  }

  lockCan500k();
  canPassiveBroadcastConfirmed = true;
  startCanAtIndex(canBitrateIndex);
  Serial.printf("[WUJI] locked %s kbps — passive LISTEN\n", CAN_KBPS_LABELS[canBitrateIndex]);
  notifyCanBitrate(true);
}

static void tickCanBitrateProbe() {
  (void)0;
}

static void tickCanStatusBle() {
  if (!bleConnected || bleSuppressTelemetry || bleCmdPending) return;
  if (appMode == APP_RUNTIME) return;
  uint32_t now = millis();
  if (now - lastStatusBleMs < 1000) return;
  lastStatusBleMs = now;
  sendCanStatus();
}

static void tickBleCommandQueue() {
  if (!bleCmdPending) return;
  bleCmdPending = false;
  String line = blePendingCmdLine;
  blePendingCmdLine = "";
  handleCommand(line);
  bleSuppressTelemetry = false;
}

static void restartCanProbe() {
  canRxSessionCount = 0;
  canPassiveFrameCount = 0;
  knownVehicleBroadcastCount = 0;
  canPassiveBroadcastConfirmed = false;
  lastVehicleRxMs = 0;
  passiveFpsWinStartMs = 0;
  passiveFpsWinCount = 0;
  passiveFpsStreak = 0;
  lockCan500k();
  if (!startCanAtIndex(CAN_IDX_500K)) {
    startCanAtIndex(0);
  }
  notifyCanBitrate(true);
  sendCanStatus();
  Serial.println("[CAN] reprobe 500k locked — Wuji passive listen");
}

static bool initCan() {
  canRxSessionCount = 0;
  canPassiveFrameCount = 0;
  knownVehicleBroadcastCount = 0;
  canPassiveBroadcastConfirmed = false;
  lastVehicleRxMs = 0;
  passiveFpsWinStartMs = 0;
  passiveFpsWinCount = 0;
  passiveFpsStreak = 0;
  lockCan500k();
  if (!startCanAtIndex(CAN_IDX_500K)) {
    if (!startCanAtIndex(0)) return false;
  }
  Serial.printf("[CAN] init 500k locked mode=%s passive\n",
                canTwaiMode() == TWAI_MODE_NORMAL ? "NORMAL" : "LISTEN");
  return true;
}

static void ledsOff() {
  for (int i = 0; i < MAX_LEDS; i++) leds[i] = CRGB::Black;
  FastLED.show();
  ledDisplayCount = 0;
  ledDisplayInt = 0;
  ledTargetInt = 0;
  lastLedStepMs = 0;
  ledGapSinceMs = 0;
  lastPaintCount = -1.f;
  lastRenderGear = -2;
  lastRenderFull = -1;
  lastRenderPart = -1.f;
}

static void paintAllLeds(CRGB color) {
  for (int i = 0; i < MAX_LEDS; i++) {
    leds[i] = (i < numLeds) ? color : CRGB::Black;
  }
  FastLED.show();
}

static void enterRunningLedMode() {
  ledFxPhase = LED_FX_RUNNING;
  runtimeCanCelebrated = true;
  ledsOff();
}

static void startBootWhiteFx() {
  ledFxPhase = LED_FX_BOOT_WHITE;
  runtimeCanCelebrated = false;
  runtimeCanSawMatch = false;
  paintAllLeds(CRGB::White);
  Serial.println("[LED] boot white — waiting CAN match");
}

static void startWriteSequenceFx() {
  ledFxPhase = LED_FX_WRITE_SEQUENCE;
  ledFxStep = 0;
  ledFxLastMs = millis();
  runtimeCanCelebrated = false;
  runtimeCanSawMatch = false;
  for (int i = 0; i < MAX_LEDS; i++) leds[i] = CRGB::Black;
  FastLED.show();
  Serial.println("[LED] write ok — lighting each LED");
}

static void startMatchBlueFx() {
  if (runtimeCanCelebrated) return;
  ledFxPhase = LED_FX_MATCH_BLUE;
  ledFxStep = 0;
  ledFxLastMs = millis();
  paintAllLeds(CRGB::Black);
  Serial.println("[LED] CAN matched — blue flash x5");
}

static void stopLedFx() {
  ledFxPhase = LED_FX_OFF;
  ledFxStep = 0;
  runtimeCanCelebrated = false;
  runtimeCanSawMatch = false;
}

static void tryTriggerRuntimeCanMatch() {
  if (appMode != APP_RUNTIME || !runtimeCfg.valid) return;
  if (runtimeCanCelebrated || runtimeCanSawMatch) return;
  if (ledFxPhase != LED_FX_BOOT_WHITE) return;
  runtimeCanSawMatch = true;
  startMatchBlueFx();
}

static void tickLedEffects() {
  uint32_t now = millis();
  switch (ledFxPhase) {
    case LED_FX_BOOT_WHITE:
    case LED_FX_RUNNING:
    case LED_FX_OFF:
      break;
    case LED_FX_WRITE_SEQUENCE:
      if (ledFxStep < numLeds) {
        if (now - ledFxLastMs < LED_FX_WRITE_STEP_MS) return;
        leds[ledFxStep] = CRGB::White;
        FastLED.show();
        ledFxStep++;
        ledFxLastMs = now;
      } else if (ledFxStep == numLeds) {
        paintAllLeds(CRGB::White);
        ledFxStep = numLeds + 1;
        ledFxLastMs = now;
      } else if (ledFxStep == numLeds + 1) {
        if (now - ledFxLastMs < LED_FX_WRITE_HOLD_MS) return;
        startBootWhiteFx();
      }
      break;
    case LED_FX_MATCH_BLUE:
      if (now - ledFxLastMs < LED_FX_BLUE_HALF_MS) return;
      ledFxLastMs = now;
      ledFxStep++;
      if (ledFxStep > LED_FX_BLUE_FLASH_COUNT * 2) {
        enterRunningLedMode();
        Serial.println("[LED] running bar");
        return;
      }
      if (ledFxStep % 2 == 1) {
        paintAllLeds(CRGB(0, 70, 255));
      } else {
        paintAllLeds(CRGB::Black);
      }
      break;
    default:
      break;
  }
}

static CRGB gearColor(int g) {
  if (g == 0) return CRGB(0, 200, 40);
  if (g == 1) return CRGB(30, 90, 255);
  if (g == 2) return CRGB(255, 210, 0);
  if (g == 3) return CRGB(255, 80, 30);
  if (g == 4) return CRGB(255, 40, 120);
  if (g == 5) return CRGB(180, 60, 255);
  if (g >= 6) return CRGB(255, 40, 40);
  return CRGB(255, 40, 40);
}

static void paintLedBar(int gear, int litCount, bool forceShow = false) {
  if (litCount < 0) litCount = 0;
  if (litCount > numLeds) litCount = numLeds;

  CRGB c = gearColor(gear >= 0 ? gear : 0);
  if (gear < 0) c = CRGB(40, 40, 40);

  if (!forceShow && gear == lastRenderGear && litCount == lastRenderFull) return;
  lastRenderGear = gear;
  lastRenderFull = litCount;
  lastRenderPart = 0.f;
  lastPaintCount = (float)litCount;

  for (int i = 0; i < MAX_LEDS; i++) {
    leds[i] = (i < litCount) ? c : CRGB::Black;
  }
  FastLED.show();
}

/** 回落略快于上升，但逐步减灯，避免大 gap 直接 snap */
static void tickLedSmooth() {
  if (ledFxPhase != LED_FX_RUNNING) return;
  if (appMode != APP_RUNTIME || !runtimeCfg.valid) return;

  int gap = ledTargetInt - ledDisplayInt;
  if (gap == 0) {
    ledGapSinceMs = 0;
    return;
  }

  uint32_t now = millis();
  if (!ledGapSinceMs) ledGapSinceMs = now;

  int absGap = gap > 0 ? gap : -gap;
  bool falling = gap < 0;
  int snapGap = LED_SNAP_FALL_GAP;
  if (snapGap < numLeds / 3) snapGap = numLeds / 3;
  if (snapGap < 24) snapGap = 24;

  if ((now - ledGapSinceMs) >= LED_GAP_WATCHDOG_MS) {
    if (!falling || absGap >= snapGap) {
      ledDisplayInt = ledTargetInt;
      ledDisplayCount = (float)ledDisplayInt;
      lastLedStepMs = now;
      ledGapSinceMs = 0;
      paintLedBar(runtimeGear, ledDisplayInt, true);
      return;
    }
  }

  if (falling && absGap >= snapGap) {
    ledDisplayInt = ledTargetInt;
    ledDisplayCount = (float)ledDisplayInt;
    lastLedStepMs = now;
    paintLedBar(runtimeGear, ledDisplayInt, true);
    return;
  }

  uint32_t interval = falling ? LED_STEP_MS_FALL : LED_STEP_MS_RISE;
  if (interval && lastLedStepMs && (now - lastLedStepMs) < interval) return;
  lastLedStepMs = now;

  int step = 1;
  if (falling) {
    if (absGap >= 24) step = 3;
    else if (absGap >= 12) step = 2;
  } else {
    if (absGap >= 16) step = 5;
    else if (absGap >= 10) step = 4;
    else if (absGap >= 6) step = 3;
    else if (absGap >= 3) step = 2;
  }

  if (gap > 0) ledDisplayInt += (step > gap) ? gap : step;
  else ledDisplayInt -= (step > -gap) ? -gap : step;

  ledDisplayCount = (float)ledDisplayInt;
  paintLedBar(runtimeGear, ledDisplayInt, false);
}

static float mapRpmLed(float raw) {
  float lo = (float)runtimeCfg.rpmIdle;
  float hi = (float)runtimeCfg.rpmRawMax;
  if (hi <= lo) hi = lo + 1;
  float t = (raw - lo) / (hi - lo);
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  t = t * t * (3.f - 2.f * t);
  return t * (float)numLeds;
}

static void setLedTargetFromRpm(float rpmRaw) {
  float mapped = mapRpmLed(rpmRaw);
  if (mapped < 0.f) mapped = 0.f;
  if (mapped > (float)numLeds) mapped = (float)numLeds;

  int desiredRound = (int)(mapped + 0.5f);
  int desiredFloor = (int)mapped;
  if (desiredRound < 0) desiredRound = 0;
  if (desiredRound > numLeds) desiredRound = numLeds;
  if (desiredFloor < 0) desiredFloor = 0;
  if (desiredFloor > numLeds) desiredFloor = numLeds;

  int desired = ledTargetInt;
  if (desiredRound > ledTargetInt) desired = desiredRound;
  else if (desiredFloor < ledTargetInt) desired = desiredFloor;
  else return;

  if (desired == ledTargetInt) return;
  ledTargetInt = desired;
  ledGapSinceMs = 0;
}

static uint16_t readU16BE(const uint8_t *d, uint8_t off) {
  if (off > 6) return 0;
  return (uint16_t(d[off]) << 8) | d[off + 1];
}

static uint16_t readU16LE(const uint8_t *d, uint8_t off) {
  if (off > 6) return 0;
  return (uint16_t(d[off + 1]) << 8) | d[off];
}

static uint16_t readRpmRaw(const uint8_t *d) {
  bool be = runtimeCfg.rpmBigEndian;
  if (!runtimeCfg.valid) be = true;
  return be ? readU16BE(d, runtimeCfg.rpmPairOffset)
            : readU16LE(d, runtimeCfg.rpmPairOffset);
}

static bool gearTableLooksComplete() {
  if (runtimeCfg.gearCount < 7) return false;
  bool seen[256] = {false};
  int uniq = 0;
  for (uint8_t i = 0; i < 7; i++) {
    uint8_t v = runtimeCfg.gearValues[i];
    if (!seen[v]) {
      seen[v] = true;
      uniq++;
    }
  }
  return uniq >= 4;
}

static void normalizeGearValuesInConfig() {
  if (!runtimeCfg.gearCount) return;
  if (gearTableLooksComplete()) return;

  uint8_t base = runtimeCfg.gearValues[0];
  int step = 0;
  if (runtimeCfg.gearCount >= 2) {
    step = (int)runtimeCfg.gearValues[1] - (int)runtimeCfg.gearValues[0];
  }

  bool allZero = true;
  for (uint8_t i = 0; i < runtimeCfg.gearCount && i < 7; i++) {
    if (runtimeCfg.gearValues[i] != 0) {
      allZero = false;
      break;
    }
  }

  if (allZero) {
    for (uint8_t i = 0; i < 7; i++) runtimeCfg.gearValues[i] = i;
    runtimeCfg.gearCount = 7;
    return;
  }

  if (step != 0) {
    for (uint8_t i = 0; i < 7; i++) {
      int predicted = (int)base + (int)i * step;
      if (predicted < 0 || predicted > 255) continue;
      runtimeCfg.gearValues[i] = (uint8_t)predicted;
    }
    runtimeCfg.gearCount = 7;
    return;
  }

  if (runtimeCfg.gearCount < 7) {
    runtimeCfg.gearCount = 7;
  }
}

static int decodeGear(const uint8_t *d) {
  if (!runtimeCfg.gearCount) return -1;
  uint8_t v = d[runtimeCfg.gearOffset];
  for (uint8_t i = 0; i < runtimeCfg.gearCount && i < 7; i++) {
    if (v == runtimeCfg.gearValues[i]) return (int)i;
  }
  /* 顺序挡位外推（任意起点/步长，不限于 0 起步） */
  if (runtimeCfg.gearCount >= 2) {
    int step = (int)runtimeCfg.gearValues[1] - (int)runtimeCfg.gearValues[0];
    if (step != 0) {
      int idx = ((int)v - (int)runtimeCfg.gearValues[0]) / step;
      if (idx >= 0 && idx < 7) return idx;
    }
  }
  return -1;
}

static void sendRuntimeState() {
  if (appMode != APP_RUNTIME || !runtimeCfg.valid || !bleConnected) return;
  if (bleSuppressTelemetry || bleCmdPending) return;
  uint32_t now = millis();
  if (now - lastRuntimeBleMs < 250) return;
  lastRuntimeBleMs = now;
  char buf[128];
  snprintf(buf, sizeof(buf),
           "{\"type\":\"runtime\",\"gear\":%d,\"rpmRaw\":%u,\"ledCount\":%d,\"num_leds\":%d,\"mode\":\"runtime\"}",
           runtimeGear, (unsigned)runtimeRpmRaw, ledDisplayInt, numLeds);
  bleSendLine(buf);
}

/** 收到挡位/转速 CAN 帧后立即 BLE 上报小程序 */
static void onRuntimeCanFrame(uint32_t id) {
  if (appMode != APP_RUNTIME || !runtimeCfg.valid) return;

  if (id == runtimeCfg.gearId || id == runtimeCfg.rpmId) {
    tryTriggerRuntimeCanMatch();
  }

  bool changed = false;
  bool gearForce = false;
  if (id == runtimeCfg.gearId) {
    auto git = liveFrames.find(runtimeCfg.gearId);
    if (git != liveFrames.end()) {
      int g = decodeGear(git->second);
      if (g >= 0) {
        gearForce = (g != runtimeGear);
        if (gearForce) {
          runtimeGear = g;
          changed = true;
        }
      }
    }
  }
  if (id == runtimeCfg.rpmId) {
    auto rit = liveFrames.find(runtimeCfg.rpmId);
    if (rit != liveFrames.end()) {
      uint16_t rpm = readRpmRaw(rit->second);
      if (rpm != runtimeRpmRaw) {
        runtimeRpmRaw = rpm;
        changed = true;
      }
      setLedTargetFromRpm((float)runtimeRpmRaw);
    }
  }
  if (id != runtimeCfg.gearId && id != runtimeCfg.rpmId) return;

  if (changed) sendRuntimeState();
  if (gearForce && ledFxPhase == LED_FX_RUNNING) paintLedBar(runtimeGear, ledDisplayInt, true);
}

static void clampLedStateAfterCountChange() {
  if (ledDisplayInt > numLeds) ledDisplayInt = numLeds;
  if (ledTargetInt > numLeds) ledTargetInt = numLeds;
  ledDisplayCount = (float)ledDisplayInt;
}

static void loadNumLeds() {
  prefs.begin("canlearn", true);
  int stored = (int)prefs.getUInt("numLeds", DEFAULT_NUM_LEDS);
  prefs.end();
  if (stored < 1) stored = DEFAULT_NUM_LEDS;
  if (stored > MAX_LEDS) stored = MAX_LEDS;
  numLeds = stored;
}

static void saveNumLeds() {
  prefs.begin("canlearn", false);
  prefs.putUInt("numLeds", (uint32_t)numLeds);
  prefs.end();
}

static bool applyNumLedsFromLine(const String &line, bool persist) {
  long v;
  if (!jsonGetLong(line, "num_leds", v)) return false;
  if (v < 1) v = 1;
  if (v > MAX_LEDS) v = MAX_LEDS;
  numLeds = (int)v;
  clampLedStateAfterCountChange();
  if (persist) saveNumLeds();
  return true;
}

static void saveRuntimeConfig() {
  prefs.begin("canlearn", false);
  prefs.putBool("valid", runtimeCfg.valid);
  prefs.putUInt("gearId", runtimeCfg.gearId);
  prefs.putUChar("gearOff", runtimeCfg.gearOffset);
  prefs.putUChar("gearCnt", runtimeCfg.gearCount);
  for (int i = 0; i < 7; i++) {
    char k[4];
    snprintf(k, sizeof(k), "g%d", i);
    prefs.putUChar(k, runtimeCfg.gearValues[i]);
  }
  prefs.putUInt("rpmId", runtimeCfg.rpmId);
  prefs.putUChar("rpmOff", runtimeCfg.rpmPairOffset);
  prefs.putBool("rpmBe", runtimeCfg.rpmBigEndian);
  prefs.putUInt("rpmIdle", runtimeCfg.rpmIdle);
  prefs.putUInt("rpmRawMax", runtimeCfg.rpmRawMax);
  prefs.putUInt("rpmMax", runtimeCfg.rpmMax);
  prefs.putFloat("rpmScale", runtimeCfg.rpmScale);
  prefs.putUInt("numLeds", (uint32_t)numLeds);
  prefs.end();
}

static void loadRuntimeConfig() {
  prefs.begin("canlearn", true);
  runtimeCfg.valid = prefs.getBool("valid", false);
  runtimeCfg.gearId = prefs.getUInt("gearId", 0);
  runtimeCfg.gearOffset = prefs.getUChar("gearOff", 0);
  runtimeCfg.gearCount = prefs.getUChar("gearCnt", 0);
  for (int i = 0; i < 7; i++) {
    char k[4];
    snprintf(k, sizeof(k), "g%d", i);
    runtimeCfg.gearValues[i] = prefs.getUChar(k, 0);
  }
  runtimeCfg.rpmId = prefs.getUInt("rpmId", 0);
  runtimeCfg.rpmPairOffset = prefs.getUChar("rpmOff", 0);
  runtimeCfg.rpmBigEndian = prefs.getBool("rpmBe", true);
  runtimeCfg.rpmIdle = prefs.getUInt("rpmIdle", 0);
  runtimeCfg.rpmRawMax = prefs.getUInt("rpmRawMax", 0);
  runtimeCfg.rpmMax = prefs.getUInt("rpmMax", 8000);
  runtimeCfg.rpmScale = prefs.getFloat("rpmScale", 1.0f);
  int storedLeds = (int)prefs.getUInt("numLeds", DEFAULT_NUM_LEDS);
  if (storedLeds >= 1 && storedLeds <= MAX_LEDS) numLeds = storedLeds;
  prefs.end();
  if (runtimeCfg.valid) normalizeGearValuesInConfig();
}

static void sendCanFrameBle(uint32_t id, const uint8_t *data, uint8_t dlc) {
  if (!bleConnected) return;
  char buf[132];
  uint8_t n = dlc > 8 ? 8 : dlc;
  int pos = snprintf(buf, sizeof(buf), "{\"type\":\"can\",\"id\":%u,\"d\":[", (unsigned)id);
  for (uint8_t b = 0; b < n; b++) {
    pos += snprintf(buf + pos, sizeof(buf) - pos, "%s%u", b ? "," : "", (unsigned)data[b]);
  }
  pos += snprintf(buf + pos, sizeof(buf) - pos, "]}\n");
  if (pos > 0 && pos < (int)sizeof(buf)) bleSendRaw(buf, (size_t)pos);
}

static bool bleTxQueuePush(uint32_t id, const uint8_t *data, uint8_t dlc) {
  uint16_t next = (uint16_t)((bleTxHead + 1) % BLE_TX_QUEUE_LEN);
  if (next == bleTxTail) return false;
  bleTxQueue[bleTxHead].id = id;
  bleTxQueue[bleTxHead].dlc = dlc > 8 ? 8 : dlc;
  memset(bleTxQueue[bleTxHead].data, 0, 8);
  memcpy(bleTxQueue[bleTxHead].data, data, bleTxQueue[bleTxHead].dlc);
  bleTxHead = next;
  return true;
}

static void tickCanBleTx() {
  if (!bleConnected || bleTxTail == bleTxHead) return;
  uint8_t sent = 0;
  while (bleTxTail != bleTxHead && sent < BLE_TX_DRAIN_PER_LOOP) {
    BatchFrame &f = bleTxQueue[bleTxTail];
    sendCanFrameBle(f.id, f.data, f.dlc);
    bleTxTail = (uint16_t)((bleTxTail + 1) % BLE_TX_QUEUE_LEN);
    sent++;
  }
}

static void bleTxQueueClear() {
  bleTxHead = 0;
  bleTxTail = 0;
}

static void onCanFrame(uint32_t id, bool extd, const uint8_t *data, uint8_t dlc) {
  uint8_t copyLen = dlc > 8 ? 8 : dlc;
  (void)extd;
  if (appMode == APP_RUNTIME) {
    liveFrames[id];
    uint8_t *slot = liveFrames[id];
    memset(slot, 0, 8);
    memcpy(slot, data, copyLen);
    onRuntimeCanFrame(id);
  }
  enqueueCanBatch(id, data, copyLen);
}

static void enqueueCanBatch(uint32_t id, const uint8_t *data, uint8_t copyLen) {
  if (!bleConnected) return;
  bleTxQueuePush(id, data, copyLen);
}

static void pollCan() {
  if (!canDriverReady) return;
  twai_message_t msg;
  int burst = (appMode == APP_RUNTIME) ? CAN_POLL_BURST_RUNTIME : CAN_POLL_BURST;
  for (int n = 0; n < burst; n++) {
    if (twai_receive(&msg, 0) != ESP_OK) break;
    uint32_t id = msg.identifier & 0x1FFFFFFF;
    onCanPacketReceived(id, msg.extd != 0);
    onCanFrame(id, msg.extd != 0, msg.data, msg.data_length_code);
  }
}

#if SIMULATE_CAN
#define SIM_GEAR_ID 0x220
#define SIM_RPM_ID 0x110
static void tickSimulateCan() {
  if (appMode != APP_STREAM || !bleConnected) return;
  static uint32_t lastSimMs = 0;
  uint32_t now = millis();
  if (now - lastSimMs < 30) return;
  lastSimMs = now;

  static uint32_t tick = 0;
  tick++;

  uint8_t gearVal = 0x00;
  if ((tick / 40) % 8 == 1) gearVal = 0x01;
  else if ((tick / 40) % 8 == 2) gearVal = 0x02;
  else if ((tick / 40) % 8 == 3) gearVal = 0x03;
  else if ((tick / 40) % 8 == 4) gearVal = 0x04;
  else if ((tick / 40) % 8 == 5) gearVal = 0x05;
  else if ((tick / 40) % 8 == 6) gearVal = 0x06;

  uint8_t gearData[8] = {0x08, 0x90, gearVal, 0x10, 0x00, 0x28, 0x08, 0x00};
  onCanFrame(SIM_GEAR_ID, false, gearData, 8);

  uint16_t rpmRaw = 0x2000 + (uint16_t)((tick * 17) % 0x3000);
  uint8_t rpmData[8] = {0x00, 0x00, (uint8_t)(rpmRaw >> 8), (uint8_t)(rpmRaw & 0xFF), 0x00, 0x00, 0x00, 0x00};
  onCanFrame(SIM_RPM_ID, false, rpmData, 8);
}
#endif

static void applyGearValuesFromLine(const String &line) {
  int arrStart = line.indexOf("\"gear_values\":[");
  if (arrStart >= 0) {
    arrStart = line.indexOf('[', arrStart);
    int arrEnd = line.indexOf(']', arrStart);
    if (arrEnd > arrStart) {
      String arr = line.substring(arrStart + 1, arrEnd);
      runtimeCfg.gearCount = 0;
      int pos = 0;
      while (pos < (int)arr.length() && runtimeCfg.gearCount < 7) {
        int comma = arr.indexOf(',', pos);
        String token = (comma < 0) ? arr.substring(pos) : arr.substring(pos, comma);
        token.trim();
        if (token.length()) runtimeCfg.gearValues[runtimeCfg.gearCount++] = (uint8_t)token.toInt();
        if (comma < 0) break;
        pos = comma + 1;
      }
      return;
    }
  }
  long v;
  runtimeCfg.gearCount = 0;
  if (jsonGetLong(line, "gear_neutral", v)) { runtimeCfg.gearValues[0] = (uint8_t)v; runtimeCfg.gearCount = 1; }
  if (jsonGetLong(line, "gear_one", v)) { runtimeCfg.gearValues[1] = (uint8_t)v; runtimeCfg.gearCount = 2; }
  if (jsonGetLong(line, "gear_2", v)) { runtimeCfg.gearValues[2] = (uint8_t)v; runtimeCfg.gearCount = 3; }
  if (jsonGetLong(line, "gear_3", v)) { runtimeCfg.gearValues[3] = (uint8_t)v; runtimeCfg.gearCount = 4; }
  if (jsonGetLong(line, "gear_4", v)) { runtimeCfg.gearValues[4] = (uint8_t)v; runtimeCfg.gearCount = 5; }
  if (jsonGetLong(line, "gear_5", v)) { runtimeCfg.gearValues[5] = (uint8_t)v; runtimeCfg.gearCount = 6; }
  if (jsonGetLong(line, "gear_6", v)) { runtimeCfg.gearValues[6] = (uint8_t)v; runtimeCfg.gearCount = 7; }
}

static void sendRuntimeConfigJson() {
  if (!runtimeCfg.valid) {
    bleSendLine("{\"type\":\"runtime_config\",\"ok\":false,\"mode\":\"stream\"}");
    return;
  }
  char buf[640];
  int pos = snprintf(buf, sizeof(buf),
    "{\"type\":\"runtime_config\",\"ok\":true,\"mode\":\"runtime\","
    "\"gear_id\":%u,\"gear_offset\":%u,\"gear_count\":%u,"
    "\"rpm_id\":%u,\"rpm_pair_offset\":%u,\"rpm_be\":%s,"
    "\"rpm_idle\":%u,\"rpm_raw_max\":%u,\"rpm_max\":%u,\"num_leds\":%d,"
    "\"detected_idle_raw\":%u,\"gear_values\":[",
    (unsigned)runtimeCfg.gearId, (unsigned)runtimeCfg.gearOffset,
    (unsigned)runtimeCfg.gearCount,
    (unsigned)runtimeCfg.rpmId, (unsigned)runtimeCfg.rpmPairOffset,
    runtimeCfg.rpmBigEndian ? "true" : "false",
    (unsigned)runtimeCfg.rpmIdle, (unsigned)runtimeCfg.rpmRawMax,
    (unsigned)runtimeCfg.rpmMax, numLeds,
    (unsigned)runtimeCfg.rpmIdle);
  for (uint8_t i = 0; i < runtimeCfg.gearCount && i < 7; i++) {
    if (pos + 8 >= (int)sizeof(buf)) break;
    pos += snprintf(buf + pos, sizeof(buf) - pos, "%s%u", i ? "," : "", (unsigned)runtimeCfg.gearValues[i]);
  }
  if (pos + 4 < (int)sizeof(buf)) {
    snprintf(buf + pos, sizeof(buf) - pos, "]}");
  }
  bleSendLine(buf);
}

static void applyRpmCalibrationFromLine(const String &line) {
  long v;
  float fv;
  if (jsonGetLong(line, "rpm_idle", v)) runtimeCfg.rpmIdle = (uint16_t)v;
  if (jsonGetLong(line, "rpm_max", v)) runtimeCfg.rpmMax = (uint16_t)v;
  if (jsonGetFloat(line, "rpm_raw_max", fv) && fv > 0) runtimeCfg.rpmRawMax = (uint16_t)fv;
  else   if (jsonGetLong(line, "rpm_raw_max", v)) runtimeCfg.rpmRawMax = (uint16_t)v;
  applyNumLedsFromLine(line, false);
  if (runtimeCfg.rpmRawMax > runtimeCfg.rpmIdle)
    runtimeCfg.rpmScale = (float)runtimeCfg.rpmMax / (float)(runtimeCfg.rpmRawMax - runtimeCfg.rpmIdle);
  else runtimeCfg.rpmScale = 1.0f;
}

static void handleCommand(const String &line) {
  if (line.indexOf("\"cmd\":\"ping\"") >= 0) {
    char buf[96];
    snprintf(buf, sizeof(buf),
             "{\"type\":\"pong\",\"mode\":\"%s\",\"profile\":\"%s\"}",
             appMode == APP_RUNTIME ? "runtime" : "stream", vehicleProfileName());
    bleSendLine(buf);
    return;
  }
  if (line.indexOf("get_runtime") >= 0) {
    sendRuntimeConfigJson();
    return;
  }
  if (line.indexOf("set_runtime") >= 0) {
    long v;
    float fv;
    runtimeCfg.valid = true;
    if (jsonGetLong(line, "gear_id", v)) runtimeCfg.gearId = (uint32_t)v;
    if (jsonGetLong(line, "gear_offset", v)) runtimeCfg.gearOffset = (uint8_t)v;
    applyGearValuesFromLine(line);
    normalizeGearValuesInConfig();
    if (jsonGetLong(line, "rpm_id", v)) runtimeCfg.rpmId = (uint32_t)v;
    if (jsonGetLong(line, "rpm_pair_offset", v)) runtimeCfg.rpmPairOffset = (uint8_t)v;
    if (line.indexOf("\"rpm_be\":true") >= 0) runtimeCfg.rpmBigEndian = true;
    else if (line.indexOf("\"rpm_be\":false") >= 0) runtimeCfg.rpmBigEndian = false;
    else runtimeCfg.rpmBigEndian = true;
    if (jsonGetLong(line, "rpm_idle", v)) runtimeCfg.rpmIdle = (uint16_t)v;
    if (jsonGetLong(line, "rpm_max", v)) runtimeCfg.rpmMax = (uint16_t)v;
    if (jsonGetFloat(line, "rpm_raw_max", fv) && fv > 0) runtimeCfg.rpmRawMax = (uint16_t)fv;
    else if (jsonGetLong(line, "rpm_raw_max", v)) runtimeCfg.rpmRawMax = (uint16_t)v;
    applyNumLedsFromLine(line, true);
    if (!runtimeCfg.gearId || !runtimeCfg.rpmId || runtimeCfg.gearCount < 2
        || !runtimeCfg.rpmIdle || runtimeCfg.rpmRawMax <= runtimeCfg.rpmIdle) {
      runtimeCfg.valid = false;
      bleSendLine("{\"type\":\"runtime_configured\",\"ok\":false,\"err\":\"invalid_config\"}");
      Serial.printf("[RUNTIME] reject gear_id=%u rpm_id=%u gear_cnt=%u idle=%u raw_max=%u\n",
                    (unsigned)runtimeCfg.gearId, (unsigned)runtimeCfg.rpmId,
                    (unsigned)runtimeCfg.gearCount, (unsigned)runtimeCfg.rpmIdle,
                    (unsigned)runtimeCfg.rpmRawMax);
      return;
    }
    if (runtimeCfg.rpmRawMax > runtimeCfg.rpmIdle)
      runtimeCfg.rpmScale = (float)runtimeCfg.rpmMax / (float)(runtimeCfg.rpmRawMax - runtimeCfg.rpmIdle);
    else runtimeCfg.rpmScale = 1.0f;
    saveRuntimeConfig();
    appMode = APP_RUNTIME;
    bleTxQueueClear();
    runtimeGear = -1;
    runtimeRpmRaw = 0;
    liveFrames.clear();
    liveFrames[runtimeCfg.gearId];
    liveFrames[runtimeCfg.rpmId];
    startWriteSequenceFx();
    bleSendLine("{\"type\":\"runtime_configured\",\"ok\":true}");
    return;
  }
  if (line.indexOf("update_rpm_calibration") >= 0) {
    if (!runtimeCfg.valid) {
      bleSendLine("{\"type\":\"rpm_calibration_updated\",\"ok\":false,\"err\":\"no_config\"}");
      return;
    }
    applyRpmCalibrationFromLine(line);
    applyNumLedsFromLine(line, true);
    if (runtimeCfg.rpmRawMax <= runtimeCfg.rpmIdle || !runtimeCfg.rpmIdle) {
      bleSendLine("{\"type\":\"rpm_calibration_updated\",\"ok\":false,\"err\":\"invalid_range\"}");
      return;
    }
    saveRuntimeConfig();
    ledDisplayCount = 0;
    ledDisplayInt = 0;
    ledTargetInt = 0;
    lastLedStepMs = 0;
    ledGapSinceMs = 0;
    lastPaintCount = -1.f;
    char buf[160];
    snprintf(buf, sizeof(buf),
             "{\"type\":\"rpm_calibration_updated\",\"ok\":true,"
             "\"rpm_idle\":%u,\"rpm_raw_max\":%u,\"rpm_max\":%u,\"num_leds\":%d}",
             (unsigned)runtimeCfg.rpmIdle, (unsigned)runtimeCfg.rpmRawMax,
             (unsigned)runtimeCfg.rpmMax, numLeds);
    bleSendLine(buf);
    return;
  }
  if (line.indexOf("set_led_count") >= 0) {
    if (applyNumLedsFromLine(line, true)) {
      char buf[96];
      snprintf(buf, sizeof(buf),
               "{\"type\":\"led_count_set\",\"ok\":true,\"num_leds\":%d}",
               numLeds);
      bleSendLine(buf);
      if (appMode == APP_RUNTIME && ledFxPhase == LED_FX_RUNNING) {
        paintLedBar(runtimeGear, ledDisplayInt, true);
      }
      Serial.printf("[LED] num_leds=%d\n", numLeds);
    } else {
      bleSendLine("{\"type\":\"led_count_set\",\"ok\":false,\"err\":\"invalid\"}");
    }
    return;
  }
  if (line.indexOf("reset_stream") >= 0) {
    runtimeCfg.valid = false;
    prefs.begin("canlearn", false);
    prefs.putBool("valid", false);
    prefs.end();
    appMode = APP_STREAM;
    bleTxQueueClear();
    liveFrames.clear();
    stopLedFx();
    ledsOff();
    restartCanProbe();
    bleSendLine("{\"type\":\"stream_reset\",\"ok\":true}");
    return;
  }
  if (line.indexOf("reprobe_can") >= 0) {
    restartCanProbe();
    bleSendLine("{\"type\":\"can_reprobe\",\"ok\":true}");
    return;
  }
  if (line.indexOf("set_vehicle_profile") >= 0 || line.indexOf("get_vehicle_profile") >= 0) {
    loadVehicleProfile();
    sendVehicleProfileJson();
    return;
  }
}

class RxCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic *pCharacteristic) {
    std::string v = pCharacteristic->getValue();
    if (v.empty()) return;
    for (size_t i = 0; i < v.length(); i++) {
      char c = v[i];
      if (c == '\n' || c == '\r') {
        if (rxBuffer.length()) {
          blePendingCmdLine = rxBuffer;
          rxBuffer = "";
          bleCmdPending = true;
        }
      } else if (rxBuffer.length() < 4096) {
        if (rxBuffer.length() == 0) bleSuppressTelemetry = true;
        rxBuffer += c;
      } else {
        rxBuffer = "";
        bleSuppressTelemetry = false;
        if (bleConnected) {
          bleSendLine("{\"type\":\"cmd_error\",\"ok\":false,\"err\":\"rx_overflow\"}");
        }
        return;
      }
    }
  }
};

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer *pServer) {
    bleConnected = true;
    bleSuppressTelemetry = false;
    bleCmdPending = false;
    blePendingCmdLine = "";
    rxBuffer = "";
    NimBLEDevice::startAdvertising();
    delay(30);
    char buf[64];
    snprintf(buf, sizeof(buf), "{\"type\":\"connected\",\"mode\":\"%s\",\"profile\":\"%s\"}",
             appMode == APP_RUNTIME ? "runtime" : "stream", vehicleProfileName());
    bleSendLine(buf);
    if (appMode == APP_RUNTIME && runtimeCfg.valid) {
      sendRuntimeState();
    } else if (canDriverReady) {
      notifyCanBitrate(canBitrateLocked);
      sendCanStatus();
    }
  }
  void onDisconnect(NimBLEServer *pServer) {
    bleConnected = false;
    rxBuffer = "";
    bleSuppressTelemetry = false;
    bleCmdPending = false;
    blePendingCmdLine = "";
    bleTxQueueClear();
    NimBLEDevice::startAdvertising();
  }
};

static void initBle() {
  NimBLEDevice::init(BLE_NAME);
  NimBLEDevice::setPower(ESP_PWR_LVL_P9);
  NimBLEDevice::setSecurityAuth(false, false, false);
  NimBLEDevice::setSecurityIOCap(3);
  NimBLEDevice::setMTU(517);
  NimBLEServer *server = NimBLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());
  NimBLEService *svc = server->createService(NUS_SERVICE);
  NimBLECharacteristic *rx = svc->createCharacteristic(NUS_RX, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);
  rx->setCallbacks(new RxCallbacks());
  txChar = svc->createCharacteristic(NUS_TX, NIMBLE_PROPERTY::NOTIFY);
  svc->start();
  NimBLEAdvertising *adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(NUS_SERVICE);
  adv->setScanResponse(true);
  adv->start();
}

void setup() {
  Serial.begin(115200);
  pinMode(BTN_PIN, INPUT_PULLDOWN);
  FastLED.addLeds<WS2812, LED_PIN, GRB>(leds, MAX_LEDS);
  FastLED.setBrightness(120);
  FastLED.setMaxRefreshRate(120, true);
  ledsOff();
  loadNumLeds();
  loadVehicleProfile();
  initCan();
  loadRuntimeConfig();
  appMode = runtimeCfg.valid ? APP_RUNTIME : APP_STREAM;
  if (runtimeCfg.valid) {
    liveFrames[runtimeCfg.gearId];
    liveFrames[runtimeCfg.rpmId];
    startBootWhiteFx();
  } else {
    stopLedFx();
    ledsOff();
  }
  initBle();
  lastFlushMs = millis();
}

static void tickButton() {
  bool high = digitalRead(BTN_PIN) == HIGH;
  uint32_t now = millis();
  if (high && !btnWasHigh && now - lastBtnMs > 300) {
    lastBtnMs = now;
    bleSendLine("{\"type\":\"btn_click\"}");
    Serial.println("[BTN] HIGH — btn_click sent to BLE");
  }
  btnWasHigh = high;
}

void loop() {
#if SIMULATE_CAN
  if (appMode == APP_STREAM) tickSimulateCan();
  else pollCan();
#else
  pollCan();
#endif
  tickCanBitrateProbe();
  tickCanStatusBle();
  tickBleCommandQueue();
  tickCanBleTx();
  tickLedEffects();
  tickLedSmooth();
  tickButton();
}
