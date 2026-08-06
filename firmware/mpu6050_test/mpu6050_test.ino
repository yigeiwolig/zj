/*
 * MPU6050 测试版 — 过坑冲击检测（抗发动机抖动）
 * --------------------------------
 * 思路：
 *   1) 芯片 DLPF 压掉高频振动
 *   2) 快/慢双 EMA：event = |快 - 慢|（过坑是「突然偏离当前抖动中心」）
 *   3) 自适应底噪：平时学 noise，阈值 = max(最小阈值, 倍数×底噪)
 *   4) 连续多帧才算 BUMP，避免毛刺误触
 *
 * 烧录：ATmega328P Nano（Old Bootloader）
 * 接线：MPU6050 VCC/GND/SCL=A5/SDA=A4；蓝牙 D6RX D7TX；D8红=锁 D10绿=正常
 *
 * 上电静止 2.5s 标定 → 再点火/骑行看串口
 * 输出：a f s d ev ns thr L n
 *   a=原始竖直  f=快  s=慢
 *   d=方向事件（快-慢）：d>0 往上加速偏大，d<0 往下
 *   ev=|d|  ns=底噪  thr=阈值  L=锁定
 * 过坑：上下都应能触发（BUMP_UP / BUMP_DN）
 *
 * 命令：
 *   TH25    最小事件阈值 0.25g（默认 25）
 *   AD35    自适应倍数 3.5×底噪（默认 35=3.5）
 *   ND4     连续命中帧数（默认 4 ≈40ms）
 *   LK15    锁定 1.5s
 *   CAL     重新标定重力（贴好后务必静止标定）
 *   S       打一行状态
 *   NOISE   打印当前底噪/阈值
 */

#include <Wire.h>
#include <SoftwareSerial.h>
#include <string.h>
#include <math.h>

static const uint8_t MPU_ADDR = 0x68;
static const uint8_t REG_PWR_MGMT_1 = 0x6B;
static const uint8_t REG_SMPLRT_DIV = 0x19;
static const uint8_t REG_CONFIG = 0x1A;
static const uint8_t REG_GYRO_CONFIG = 0x1B;
static const uint8_t REG_ACCEL_CONFIG = 0x1C;
static const uint8_t REG_ACCEL_XOUT_H = 0x3B;
static const uint8_t REG_WHO_AM_I = 0x75;

static const uint8_t PIN_LED_RED = 8;
static const uint8_t PIN_LED_GREEN = 10;

SoftwareSerial ble(6, 7);

static const float ACC_LSB_PER_G = 4096.0f; // ±8g

static const unsigned long CAL_MS = 2500UL;
static const unsigned long SAMPLE_MS = 10UL;  // 100 Hz
static const unsigned long PRINT_MS = 100UL;

// 快 EMA ≈ 压发动机；慢 EMA ≈ 跟车身姿态/稳态抖动中心
// alpha 越大越跟得紧。快:0.25(~25Hz有效) 慢:0.02(~2Hz)
static const float ALPHA_FAST = 0.22f;
static const float ALPHA_SLOW = 0.018f;
// 底噪学习：只在未锁定时更新，很慢
static const float ALPHA_NOISE = 0.01f;

uint8_t mpuOk = 0;
uint8_t calibrated = 0;
uint8_t filtReady = 0;

float gX = 0, gY = 0, gZ = 1;
float aRaw = 1.0f;
float aFast = 1.0f;
float aSlow = 1.0f;
float deltaG = 0;       // fast-slow：+往上 / -往下
float eventG = 0;       // |delta|
float noiseRms = 0.08f; // 自适应底噪初值
float thrNow = 0.25f;
int8_t lastBumpDir = 0; // +1 UP, -1 DN

// TH25 → 0.25g 最小阈值；AD35 → 3.5×noise；ND4 连续帧
uint16_t th01g = 25;
uint16_t ad10 = 35;
uint8_t needHits = 4;
uint16_t lock01s = 15;

uint8_t hitStreak = 0;
uint8_t locked = 0;
unsigned long lockUntilMs = 0;
uint32_t bumpCount = 0;

unsigned long calStartMs = 0;
float calSumX = 0, calSumY = 0, calSumZ = 0;
uint16_t calN = 0;

unsigned long lastSampleMs = 0;
unsigned long lastPrintMs = 0;

#define RX_MAX 24
char rxBuf[RX_MAX];
uint8_t rxLen = 0;

static void ledNormal() {
  digitalWrite(PIN_LED_RED, LOW);
  digitalWrite(PIN_LED_GREEN, HIGH);
}

static void ledLock() {
  digitalWrite(PIN_LED_RED, HIGH);
  digitalWrite(PIN_LED_GREEN, LOW);
}

static void ledCalBlink(unsigned long now) {
  digitalWrite(PIN_LED_RED, LOW);
  digitalWrite(PIN_LED_GREEN, ((now / 200) & 1) ? HIGH : LOW);
}

static void mpuWrite(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.write(val);
  Wire.endTransmission();
}

static uint8_t mpuRead8(uint8_t reg) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, (uint8_t)1);
  if (Wire.available()) return Wire.read();
  return 0xFF;
}

static int16_t mpuRead16(uint8_t reg) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, (uint8_t)2);
  if (Wire.available() < 2) return 0;
  return (int16_t)((Wire.read() << 8) | Wire.read());
}

static uint8_t mpuInit() {
  uint8_t who = mpuRead8(REG_WHO_AM_I);
  Serial.print(F("WHO=0x"));
  Serial.println(who, HEX);

  mpuWrite(REG_PWR_MGMT_1, 0x00);
  delay(50);
  // 采样 ~100Hz；DLPF=5 → accel 带宽约 10Hz，先砍掉发动机高频
  mpuWrite(REG_SMPLRT_DIV, 0x09);
  mpuWrite(REG_CONFIG, 0x05);
  mpuWrite(REG_GYRO_CONFIG, 0x08);
  mpuWrite(REG_ACCEL_CONFIG, 0x10); // ±8g
  delay(20);
  who = mpuRead8(REG_WHO_AM_I);
  return (who != 0xFF && who != 0x00);
}

static void readAccelG(float *ax, float *ay, float *az) {
  int16_t rx = mpuRead16(REG_ACCEL_XOUT_H);
  int16_t ry = mpuRead16(REG_ACCEL_XOUT_H + 2);
  int16_t rz = mpuRead16(REG_ACCEL_XOUT_H + 4);
  *ax = (float)rx / ACC_LSB_PER_G;
  *ay = (float)ry / ACC_LSB_PER_G;
  *az = (float)rz / ACC_LSB_PER_G;
}

static void resetFilters() {
  filtReady = 0;
  hitStreak = 0;
  noiseRms = 0.08f;
}

static void startCal() {
  calibrated = 0;
  calStartMs = millis();
  calSumX = calSumY = calSumZ = 0;
  calN = 0;
  locked = 0;
  resetFilters();
  Serial.println(F("CAL start: keep still 2.5s"));
  ble.println(F("CAL start"));
}

static void finishCal() {
  if (calN < 50) {
    Serial.println(F("CAL fail: few samples"));
    return;
  }
  float mx = calSumX / (float)calN;
  float my = calSumY / (float)calN;
  float mz = calSumZ / (float)calN;
  float n = sqrt(mx * mx + my * my + mz * mz);
  if (n < 0.5f || n > 1.8f) {
    Serial.print(F("CAL fail |g|="));
    Serial.println(n, 3);
    return;
  }
  gX = mx / n;
  gY = my / n;
  gZ = mz / n;
  calibrated = 1;
  resetFilters();
  Serial.print(F("CAL ok |g|="));
  Serial.println(n, 3);
  ble.println(F("CAL ok"));
  ledNormal();
}

static float calcThr() {
  float minTh = th01g / 100.0f;
  float adapt = (ad10 / 10.0f) * noiseRms;
  return (adapt > minTh) ? adapt : minTh;
}

static void printStatus(Stream &out) {
  out.print(F("a="));
  out.print(aRaw, 2);
  out.print(F(" f="));
  out.print(aFast, 2);
  out.print(F(" s="));
  out.print(aSlow, 2);
  out.print(F(" d="));
  out.print(deltaG, 2);
  out.print(F(" ev="));
  out.print(eventG, 2);
  out.print(F(" ns="));
  out.print(noiseRms, 2);
  out.print(F(" thr="));
  out.print(thrNow, 2);
  out.print(F(" L="));
  out.print(locked ? 1 : 0);
  out.print(F(" n="));
  out.println(bumpCount);
}

static void handleCmd(char *cmd) {
  while (*cmd == ' ' || *cmd == '\t') cmd++;
  if (cmd[0] == 0) return;

  if (strcmp(cmd, "CAL") == 0 || strcmp(cmd, "cal") == 0) {
    startCal();
    return;
  }
  if (strcmp(cmd, "S") == 0 || strcmp(cmd, "s") == 0) {
    printStatus(Serial);
    printStatus(ble);
    return;
  }
  if (strcmp(cmd, "NOISE") == 0 || strcmp(cmd, "noise") == 0) {
    Serial.print(F("ns="));
    Serial.print(noiseRms, 3);
    Serial.print(F(" thr="));
    Serial.println(calcThr(), 3);
    return;
  }
  if ((cmd[0] == 'T' || cmd[0] == 't') && (cmd[1] == 'H' || cmd[1] == 'h')) {
    int v = atoi(cmd + 2);
    if (v >= 5 && v <= 300) {
      th01g = (uint16_t)v;
      Serial.print(F("TH min="));
      Serial.println(th01g / 100.0f, 2);
    }
    return;
  }
  if ((cmd[0] == 'A' || cmd[0] == 'a') && (cmd[1] == 'D' || cmd[1] == 'd')) {
    int v = atoi(cmd + 2);
    if (v >= 15 && v <= 100) {
      ad10 = (uint16_t)v;
      Serial.print(F("AD x"));
      Serial.println(ad10 / 10.0f, 1);
    }
    return;
  }
  if ((cmd[0] == 'N' || cmd[0] == 'n') && (cmd[1] == 'D' || cmd[1] == 'd')) {
    int v = atoi(cmd + 2);
    if (v >= 1 && v <= 20) {
      needHits = (uint8_t)v;
      Serial.print(F("ND="));
      Serial.println(needHits);
    }
    return;
  }
  if ((cmd[0] == 'L' || cmd[0] == 'l') && (cmd[1] == 'K' || cmd[1] == 'k')) {
    int v = atoi(cmd + 2);
    if (v >= 5 && v <= 100) {
      lock01s = (uint16_t)v;
      Serial.print(F("LK="));
      Serial.println(lock01s / 10.0f, 1);
    }
    return;
  }
}

static void pollRx(Stream &in) {
  while (in.available()) {
    char c = (char)in.read();
    if (c == '\r' || c == '\n') {
      if (rxLen > 0) {
        rxBuf[rxLen] = 0;
        handleCmd(rxBuf);
        rxLen = 0;
      }
      continue;
    }
    if (rxLen + 1 < RX_MAX) rxBuf[rxLen++] = c;
  }
}

void setup() {
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  digitalWrite(PIN_LED_RED, LOW);
  digitalWrite(PIN_LED_GREEN, LOW);

  Serial.begin(115200);
  ble.begin(115200);
  Wire.begin();
  delay(100);

  Serial.println(F("MPU6050 TEST v2 anti-vibe"));
  ble.println(F("MPU6050 TEST v2"));

  mpuOk = mpuInit();
  if (!mpuOk) {
    Serial.println(F("MPU FAIL check A4/A5"));
    ble.println(F("MPU FAIL"));
  } else {
    Serial.println(F("MPU ok — still 2.5s"));
    startCal();
  }
}

void loop() {
  pollRx(Serial);
  pollRx(ble);

  unsigned long now = millis();

  if (!mpuOk) {
    digitalWrite(PIN_LED_RED, ((now / 300) & 1) ? HIGH : LOW);
    digitalWrite(PIN_LED_GREEN, LOW);
    delay(50);
    return;
  }

  if (!calibrated) {
    ledCalBlink(now);
    if (now - lastSampleMs >= SAMPLE_MS) {
      lastSampleMs = now;
      float ax, ay, az;
      readAccelG(&ax, &ay, &az);
      calSumX += ax;
      calSumY += ay;
      calSumZ += az;
      calN++;
    }
    if (now - calStartMs >= CAL_MS) finishCal();
    return;
  }

  if (now - lastSampleMs >= SAMPLE_MS) {
    lastSampleMs = now;
    float ax, ay, az;
    readAccelG(&ax, &ay, &az);

    aRaw = ax * gX + ay * gY + az * gZ;

    if (!filtReady) {
      aFast = aRaw;
      aSlow = aRaw;
      filtReady = 1;
    } else {
      aFast = aFast + ALPHA_FAST * (aRaw - aFast);
      aSlow = aSlow + ALPHA_SLOW * (aRaw - aSlow);
    }

    // d>0：相对当前基线更「往上」；d<0：更「往下」
    // 过坑压缩/回弹都会偏离，用 |d| 双侧触发
    deltaG = aFast - aSlow;
    eventG = fabs(deltaG);

    // 未锁定时学习「常态抖动」底噪
    if (!locked) {
      noiseRms = noiseRms + ALPHA_NOISE * (eventG - noiseRms);
      if (noiseRms < 0.02f) noiseRms = 0.02f;
      if (noiseRms > 1.5f) noiseRms = 1.5f;
    }

    thrNow = calcThr();

    if (eventG >= thrNow) {
      if (hitStreak < 255) hitStreak++;
    } else {
      hitStreak = 0;
    }

    if (hitStreak >= needHits) {
      if (!locked) {
        lastBumpDir = (deltaG >= 0) ? 1 : -1;
        bumpCount++;
        Serial.print(lastBumpDir > 0 ? F("BUMP_UP #") : F("BUMP_DN #"));
        Serial.print(bumpCount);
        Serial.print(F(" d="));
        Serial.print(deltaG, 2);
        Serial.print(F(" ev="));
        Serial.print(eventG, 2);
        Serial.print(F(" thr="));
        Serial.print(thrNow, 2);
        Serial.print(F(" ns="));
        Serial.println(noiseRms, 2);
        ble.print(lastBumpDir > 0 ? F("BUMP_UP ") : F("BUMP_DN "));
        ble.println(bumpCount);
      }
      locked = 1;
      lockUntilMs = now + (unsigned long)lock01s * 100UL;
      hitStreak = 0;
    }

    if (locked && (long)(now - lockUntilMs) >= 0) {
      locked = 0;
      Serial.println(F("UNLOCK"));
      ble.println(F("UNLOCK"));
    }

    if (locked) ledLock();
    else ledNormal();
  }

  if (now - lastPrintMs >= PRINT_MS) {
    lastPrintMs = now;
    printStatus(Serial);
  }

  static unsigned long lastBleMs = 0;
  if (now - lastBleMs >= 200UL) {
    lastBleMs = now;
    printStatus(ble);
  }
}
