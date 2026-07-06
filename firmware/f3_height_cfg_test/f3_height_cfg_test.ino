/*
 * F3 MAX 测高配置 — 独立调试固件（仅测 M1/M0 + DA/TB 写入 EEPROM + 状态回读）
 *
 * 用途：排查小程序「危险高度写不入 / 回读仍是旧值」问题。
 * 不含：舵机、TOF、隐蔽模式、自检等主程序逻辑。
 *
 * 烧录：ATmega328P Nano（Old Bootloader），只需本文件，无需 VL53L0X。
 * Mixly：把本 .ino 拷到工程目录，改名为 testArduino.ino 或单独开工程。
 *
 * 接线（与正式版相同）：
 *   D6 RX / D7 TX → 蓝牙模块
 *   USB 串口 9600 → 调试日志
 *   D8 红灯 / D10 绿灯 → 写入成功闪绿灯
 *
 * 测试步骤：
 *   1. 上电打开串口监视器 9600，应见 "F3 HGT CFG TEST"
 *   2. 小程序连蓝牙，点「进入测高配置模式」→ 串口应见 HIT M1、>M1
 *   3. 写危险高度 300 → 串口应见逐字 RX、>DA300S33、OK DA 300、SAV DGA=300
 *   4. 小程序回读 |DGA:300|；若固件 OK 但小程序仍 70 → 查小程序/BLE
 *
 * 调好以后改烧回 firmware/f3_max_servo/f3_max_servo.ino 正式版。
 */

#include <EEPROM.h>
#include <SoftwareSerial.h>
#include <string.h>

#define RX_BUF_SIZE 48
#define RX_CMD_MAX 24

const uint16_t F3_HEIGHT_MM_MIN = 10;
const uint16_t F3_HEIGHT_MM_MAX = 3000;
const uint8_t F3_EEPROM_MAGIC_ADDR = 38;
const uint8_t F3_EEPROM_MAGIC = 0xA7;
const uint8_t F3_PIN_LED_RED = 8;
const uint8_t F3_PIN_LED_GREEN = 10;

SoftwareSerial bleSerial(6, 7);

char rxBuf[RX_BUF_SIZE];
uint8_t rxLen = 0;
unsigned long lastRxMs = 0;
const unsigned long rxTimeoutMs = 100;

uint8_t cfgMode = 0;
uint16_t dangerMm = 0;
uint16_t baseMm = 0;

unsigned long lastStatusMs = 0;
uint8_t forceStatus = 1;

static void usbLn(const __FlashStringHelper *s) {
  Serial.println(s);
}

static void usbTagU16(const __FlashStringHelper *tag, uint16_t v) {
  Serial.print(tag);
  Serial.println(v);
}

static void usbCmd(const char *cmd) {
  Serial.print(F(">"));
  Serial.println(cmd);
}

static void trimBuf(char *s) {
  uint8_t len = strlen(s);
  while (len > 0 && (s[len - 1] == '\r' || s[len - 1] == '\n' || s[len - 1] == ' ' || s[len - 1] == '#')) {
    s[--len] = 0;
  }
  uint8_t start = 0;
  while (s[start] == ' ' || s[start] == '\r' || s[start] == '\n') start++;
  if (start > 0) memmove(s, s + start, strlen(s + start) + 1);
}

static void drainBle() {
  while (bleSerial.available()) bleSerial.read();
  rxLen = 0;
  rxBuf[0] = 0;
  lastRxMs = 0;
}

static uint8_t heightMmValid(uint16_t mm) {
  if (mm == 0) return 1;
  return (mm >= F3_HEIGHT_MM_MIN && mm <= F3_HEIGHT_MM_MAX) ? 1 : 0;
}

static void markEepromMagic() {
  EEPROM.update(F3_EEPROM_MAGIC_ADDR, F3_EEPROM_MAGIC);
}

static void clampMm(uint16_t &mm) {
  if (mm < F3_HEIGHT_MM_MIN) mm = F3_HEIGHT_MM_MIN;
  if (mm > F3_HEIGHT_MM_MAX) mm = F3_HEIGHT_MM_MAX;
}

static void loadHeights() {
  EEPROM.get(34, dangerMm);
  EEPROM.get(36, baseMm);
  if (EEPROM.read(F3_EEPROM_MAGIC_ADDR) != F3_EEPROM_MAGIC) {
    if (!heightMmValid(dangerMm)) dangerMm = 0;
    if (!heightMmValid(baseMm)) baseMm = 0;
    EEPROM.put(34, dangerMm);
    EEPROM.put(36, baseMm);
    markEepromMagic();
    return;
  }
  if (!heightMmValid(dangerMm)) {
    dangerMm = 0;
    EEPROM.put(34, dangerMm);
  }
  if (!heightMmValid(baseMm)) {
    baseMm = 0;
    EEPROM.put(36, baseMm);
  }
}

static void saveDanger(uint16_t mm) {
  if (mm == 0) {
    dangerMm = 0;
    EEPROM.put(34, dangerMm);
    markEepromMagic();
    return;
  }
  clampMm(mm);
  dangerMm = mm;
  EEPROM.put(34, dangerMm);
  uint16_t verify = 0;
  EEPROM.get(34, verify);
  if (verify != dangerMm) EEPROM.put(34, dangerMm);
  markEepromMagic();
}

static void saveBase(uint16_t mm) {
  if (mm == 0) {
    baseMm = 0;
    EEPROM.put(36, baseMm);
    markEepromMagic();
    return;
  }
  clampMm(mm);
  baseMm = mm;
  EEPROM.put(36, baseMm);
  uint16_t verify = 0;
  EEPROM.get(36, verify);
  if (verify != baseMm) EEPROM.put(36, baseMm);
  markEepromMagic();
}

static void blinkGreen(uint8_t times) {
  for (uint8_t i = 0; i < times; i++) {
    digitalWrite(F3_PIN_LED_GREEN, HIGH);
    delay(80);
    digitalWrite(F3_PIN_LED_GREEN, LOW);
    delay(80);
  }
  if (cfgMode) {
    digitalWrite(F3_PIN_LED_RED, HIGH);
    digitalWrite(F3_PIN_LED_GREEN, LOW);
  }
}

static void applyCfgLed() {
  digitalWrite(F3_PIN_LED_GREEN, LOW);
  digitalWrite(F3_PIN_LED_RED, HIGH);
}

/* 与正式固件相同：<数字>S<2位校验>，校验=数字位之和 mod 100 */
static bool parseHeightMm(const char *p, uint16_t &outMm, bool logDetail) {
  if (!p || *p < '0' || *p > '9') {
    if (logDetail) usbLn(F("PARSE fail: no digit"));
    return false;
  }
  uint16_t mm = 0;
  uint16_t digitSum = 0;
  while (*p >= '0' && *p <= '9') {
    mm = (uint16_t)(mm * 10 + (*p - '0'));
    digitSum = (uint16_t)(digitSum + (uint16_t)(*p - '0'));
    if (mm > 3000) {
      if (logDetail) usbLn(F("PARSE fail: mm>3000"));
      return false;
    }
    p++;
  }
  if (*p != 'S') {
    if (logDetail) {
      Serial.print(F("PARSE fail: need S got "));
      Serial.println((int)(uint8_t)*p);
    }
    return false;
  }
  p++;
  if (p[0] < '0' || p[0] > '9' || p[1] < '0' || p[1] > '9' || p[2] != 0) {
    if (logDetail) usbLn(F("PARSE fail: bad chk digits"));
    return false;
  }
  uint16_t chk = (uint16_t)((p[0] - '0') * 10 + (p[1] - '0'));
  uint16_t expect = digitSum % 100;
  if (logDetail) {
    Serial.print(F("PARSE mm="));
    Serial.print(mm);
    Serial.print(F(" sum="));
    Serial.print(digitSum);
    Serial.print(F(" chk="));
    Serial.print(chk);
    Serial.print(F(" expect="));
    Serial.println(expect);
  }
  if (chk != expect) {
    if (logDetail) usbLn(F("PARSE fail: ER:SUM"));
    return false;
  }
  if (mm < F3_HEIGHT_MM_MIN) {
    if (logDetail) usbLn(F("PARSE fail: mm<10"));
    return false;
  }
  outMm = mm;
  return mm <= F3_HEIGHT_MM_MAX;
}

static void printStatus() {
  bleSerial.print(F("ANG:0|ACC:1|BTN:1|ITM:0|SMO:0|CHK:0|STD:0|RET:0|PWR:0|DPO:0|ERR:0|WRN:0|STM:0|STB:0|SPD:50|HGT:0|F3C:"));
  bleSerial.print(cfgMode ? 1 : 0);
  bleSerial.print(F("|DGA:"));
  bleSerial.print(dangerMm);
  bleSerial.print(F("|DGB:"));
  bleSerial.print(baseMm);
  bleSerial.print(F("|DGD:0"));
  bleSerial.println();
  lastStatusMs = millis();
  forceStatus = 0;
  Serial.print(F("TX status F3C="));
  Serial.print(cfgMode);
  Serial.print(F(" DGA="));
  Serial.print(dangerMm);
  Serial.print(F(" DGB="));
  Serial.println(baseMm);
  Serial.print(F("TX BLE ANG:0|ACC:1|BTN:1|ITM:0|SMO:0|CHK:0|STD:0|RET:0|PWR:0|DPO:0|ERR:0|WRN:0|STM:0|STB:0|SPD:50|HGT:0|F3C:"));
  Serial.print(cfgMode ? 1 : 0);
  Serial.print(F("|DGA:"));
  Serial.print(dangerMm);
  Serial.print(F("|DGB:"));
  Serial.print(baseMm);
  Serial.println(F("|DGD:0"));
}

static bool tryHeightCmd(char *cmd) {
  if (cmd[0] == 'M' && cmd[1] == '1' && cmd[2] == 0) {
    cfgMode = 1;
    applyCfgLed();
    drainBle();
    usbLn(F("HIT M1 CFG=1"));
    forceStatus = 1;
    printStatus();
    return true;
  }
  if (cmd[0] == 'M' && cmd[1] == '0' && cmd[2] == 0) {
    cfgMode = 0;
    digitalWrite(F3_PIN_LED_RED, LOW);
    usbLn(F("HIT M0 CFG=0"));
    forceStatus = 1;
    printStatus();
    return true;
  }
  if ((cmd[0] == 'D' && cmd[1] == 'A' && cmd[2] >= '0' && cmd[2] <= '9')
      || (cmd[0] == 'T' && cmd[1] == 'B' && cmd[2] >= '0' && cmd[2] <= '9')) {
    if (!cfgMode) {
      usbLn(F("ER:CFG"));
      return false;
    }
    if (strchr(cmd, ':') || strchr(cmd, '|')) {
      usbLn(F("ER:CHR"));
      return false;
    }
    uint16_t mm = 0;
    if (!parseHeightMm(cmd + 2, mm, true)) {
      return false;
    }
    if (cmd[0] == 'D') {
      saveDanger(mm);
      usbTagU16(F("OK DA "), mm);
      usbTagU16(F("SAV DGA="), dangerMm);
    } else {
      saveBase(mm);
      usbTagU16(F("OK TB "), mm);
      usbTagU16(F("SAV DGB="), baseMm);
    }
    uint16_t eep = 0;
    EEPROM.get(cmd[0] == 'D' ? 34 : 36, eep);
    usbTagU16(F("EEPROM rd="), eep);
    blinkGreen(3);
    forceStatus = 1;
    printStatus();
    return true;
  }
  return false;
}

static void dispatchCmd(char *cmd) {
  trimBuf(cmd);
  if (cmd[0] == 0) return;
  usbCmd(cmd);
  if (tryHeightCmd(cmd)) return;
  Serial.print(F("IGNORE "));
  Serial.print(cmd);
  Serial.println(F(" (本固件仅测 M1/M0 + DA/TB，不含高级配置)"));
}

static void pollBle() {
  while (bleSerial.available()) {
    int b = bleSerial.read();
    if (b < 0) break;
    char c = (char)(b & 0xFF);
    Serial.write((uint8_t)c);
    if (c < 0x20) continue;
    if (c == '\r' || c == '\n') continue;
    if (c == '#') {
      if (rxLen < RX_BUF_SIZE - 1) rxBuf[rxLen++] = c;
      rxBuf[rxLen] = 0;
      rxLen = 0;
      trimBuf(rxBuf);
      if (rxBuf[0] != 0) dispatchCmd(rxBuf);
      rxBuf[0] = 0;
      lastRxMs = 0;
      Serial.println();
      continue;
    }
    if (rxLen >= RX_CMD_MAX) {
      usbLn(F("WARN rx overflow, reset"));
      rxLen = 0;
      rxBuf[0] = 0;
    }
    if (rxLen < RX_BUF_SIZE - 1) rxBuf[rxLen++] = c;
    lastRxMs = millis();
  }

  if (rxLen > 0 && millis() - lastRxMs > rxTimeoutMs) {
    /* M0/M1/DA/TB 小程序可能逐字 280ms 发送，勿在 100ms 超时拆包，只等 # */
    if (rxBuf[0] == 'D' || rxBuf[0] == 'T' || rxBuf[0] == 'M') {
      return;
    }
    if (cfgMode) {
      rxBuf[rxLen] = 0;
      trimBuf(rxBuf);
      if (rxBuf[0] != 0) {
        usbLn(F("TIMEOUT dispatch"));
        dispatchCmd(rxBuf);
      }
      rxLen = 0;
      rxBuf[0] = 0;
      Serial.println();
      return;
    }
    rxBuf[rxLen] = 0;
    rxLen = 0;
    trimBuf(rxBuf);
    if (rxBuf[0] != 0) dispatchCmd(rxBuf);
    rxBuf[0] = 0;
    Serial.println();
  }
}

void setup() {
  pinMode(F3_PIN_LED_RED, OUTPUT);
  pinMode(F3_PIN_LED_GREEN, OUTPUT);
  digitalWrite(F3_PIN_LED_RED, LOW);
  digitalWrite(F3_PIN_LED_GREEN, LOW);

  Serial.begin(9600);
  bleSerial.begin(115200);
  delay(300);

  loadHeights();
  usbLn(F("=== F3 HGT CFG TEST ==="));
  usbTagU16(F("boot DGA="), dangerMm);
  usbTagU16(F("boot DGB="), baseMm);
  usbLn(F("USB=9600 BLE=115200 D6RX D7TX"));
  forceStatus = 1;
}

void loop() {
  pollBle();

  unsigned long now = millis();
  if (cfgMode) {
    if (forceStatus || now - lastStatusMs >= 400UL) printStatus();
  } else if (forceStatus || now - lastStatusMs >= 1000UL) {
    printStatus();
  }
}
