/*
 * F3 MAX 高级配置 — 独立调试固件（仅测高级设置 BLE 收包 + EEPROM + 状态回读）
 *
 * 用途：排查正式固件「高级配置点了没反应 / 小程序回读不更新」。
 * 从 firmware/f3_max_servo/f3_max_servo.ino 抽出 handleBlePersistSetting + 状态包字段。
 * 不含：舵机、TOF、测高 M1/DA/TB、隐蔽模式、故障锁定、翻板等。
 *
 * 接收逻辑：与 f3_max_servo pollBleSerial 一致（String 累加、# 立即派发、100ms 超时、过滤 ANG:）
 *
 * 烧录：ATmega328P Nano（Old Bootloader），只需本文件。
 * 接线：D6 RX / D7 TX → 蓝牙；USB 9600 → 调试日志；D8 红灯 / D10 绿灯。
 *
 * 测试步骤：
 *   1. 上电串口 9600，应见 "F3 ADV CFG TEST" 及 boot RET/PWR/STD...
 *   2. 小程序连蓝牙，打开高级设置，点「打开收回」「开机下翻」「开启堵转检测」等
 *   3. 串口会打印收到的所有数据
 *   4. 若有 RX:打开收回 → 收到命令，应有 OK 反馈
 *   5. 若只有蓝牙模块的 +CONNECTED 等 → 小程序没发命令或蓝牙配置问题
 */

#include <EEPROM.h>
#include <SoftwareSerial.h>
#include <string.h>

const uint8_t F3_PIN_LED_RED = 8;
const uint8_t F3_PIN_LED_GREEN = 10;

const uint8_t SERVO_SPEED_MIN_PCT = 10;
const uint8_t SERVO_SPEED_MAX_PCT = 100;
const uint8_t SERVO_SPEED_DEFAULT_PCT = 100;
const int DELAY_PWR_MIN_MAX = 10080;

SoftwareSerial bleSerial(6, 7);

String bleRxStr = "";
unsigned long lastBleRxTime = 0;
const unsigned long bleRxTimeout = 100;

int accRetractOn = 0;
int selfCheckOn = 0;
int powerOnFlip = 0;
int delayPowerOffMin = 0;
uint8_t userServoSpeed = SERVO_SPEED_DEFAULT_PCT;
uint8_t stealthBtnExitOn = 1;
uint8_t stallDetectOn = 0;

unsigned long lastStatusMs = 0;
uint8_t forceStatus = 1;

static void usbLn(const __FlashStringHelper *s) {
  Serial.println(s);
}

static void usbTagI16(const __FlashStringHelper *tag, int v) {
  Serial.print(tag);
  Serial.println(v);
}

static void blinkGreen(uint8_t times) {
  for (uint8_t i = 0; i < times; i++) {
    digitalWrite(F3_PIN_LED_GREEN, HIGH);
    delay(80);
    digitalWrite(F3_PIN_LED_GREEN, LOW);
    delay(80);
  }
}

static void blinkRed(uint8_t times, int onMs, int offMs) {
  for (uint8_t i = 0; i < times; i++) {
    digitalWrite(F3_PIN_LED_RED, HIGH);
    delay(onMs);
    digitalWrite(F3_PIN_LED_RED, LOW);
    delay(offMs);
  }
}

/* 与正式固件 stallCheckActive() 一致：F3 优先 |STD:|，未写过则回退 |CHK:| */
static bool stallCheckActive() {
  if (stallDetectOn == 0 || stallDetectOn == 1) return stallDetectOn == 1;
  return selfCheckOn == 1;
}

static void loadSettings() {
  EEPROM.get(5, accRetractOn);
  EEPROM.get(7, selfCheckOn);
  EEPROM.get(9, powerOnFlip);
  if (powerOnFlip != 0 && powerOnFlip != 1) {
    powerOnFlip = 0;
    EEPROM.put(9, 0);
  }
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
  EEPROM.get(28, stealthBtnExitOn);
  if (stealthBtnExitOn != 0 && stealthBtnExitOn != 1) {
    stealthBtnExitOn = 1;
    EEPROM.put(28, stealthBtnExitOn);
  }
  EEPROM.get(29, stallDetectOn);
}

static void printBootSettings() {
  usbTagI16(F("boot RET(accRetractOn@5)="), accRetractOn);
  usbTagI16(F("boot CHK(selfCheckOn@7)="), selfCheckOn);
  usbTagI16(F("boot PWR(powerOnFlip@9)="), powerOnFlip);
  usbTagI16(F("boot DPO(delayPowerOffMin@15)="), delayPowerOffMin);
  usbTagI16(F("boot SPD(userServoSpeed@25)="), userServoSpeed);
  usbTagI16(F("boot STB(stealthBtnExitOn@28)="), stealthBtnExitOn);
  usbTagI16(F("boot STD(stallDetectOn@29)="), stallDetectOn);
  Serial.print(F("boot STD_active="));
  Serial.println(stallCheckActive() ? 1 : 0);
}

static void printStatusLine(Stream &out) {
  int accPin = digitalRead(2);
  int btnPin = digitalRead(5);
  out.print(F("ANG:0|ACC:"));
  out.print(accPin);
  out.print(F("|BTN:"));
  out.print(btnPin);
  out.print(F("|ITM:0|SMO:0|CHK:"));
  out.print(selfCheckOn);
  out.print(F("|STD:"));
  out.print(stallCheckActive() ? 1 : 0);
  out.print(F("|RET:"));
  out.print(accRetractOn);
  out.print(F("|PWR:"));
  out.print(powerOnFlip);
  out.print(F("|DPO:"));
  out.print(delayPowerOffMin);
  out.print(F("|ERR:0|WRN:0|STM:0|STB:"));
  out.print(stealthBtnExitOn ? 1 : 0);
  out.print(F("|SPD:"));
  out.print(userServoSpeed);
  out.print(F("|HGT:0|F3C:0|DGA:0|DGB:0|DGD:0"));
  out.println();
}

/* 状态包只走 BLE 给小程序回读；USB 不打印，避免一连蓝牙就刷屏 */
static void publishBleStatus() {
  if (bleRxStr.length() > 0) return;
  if (lastBleRxTime > 0 && millis() - lastBleRxTime < bleRxTimeout + 20UL) return;

  printStatusLine(bleSerial);
  lastStatusMs = millis();
  forceStatus = 0;
}

static void notifySettingSaved(const __FlashStringHelper *tag, int eepAddr, int val) {
  Serial.print(F("OK "));
  Serial.print(tag);
  Serial.print(F(" EEPROM["));
  Serial.print(eepAddr);
  Serial.print(F("]="));
  Serial.println(val);
  blinkGreen(2);
  forceStatus = 1;
  publishBleStatus();
}

/* 与 f3_max_servo dispatchBleRxCmd 一致：去 # / 换行，避免小程序或模块尾缀导致匹配失败 */
static void trimBleCmd(String &s) {
  s.trim();
  while (s.length() > 0) {
    char c = s.charAt(s.length() - 1);
    if (c == '#' || c == '\r' || c == '\n') {
      s.remove(s.length() - 1);
    } else {
      break;
    }
  }
  s.trim();
}

static bool handleBlePersistSetting(String cmd) {
  cmd.trim();
  if (cmd.length() == 0) return false;
  
  /* USB/串口 ASCII 快捷测（监视器无法输入中文时用） */
  if (cmd == "RET1" || cmd == "ret1") {
    accRetractOn = 1;
    EEPROM.put(5, accRetractOn);
    notifySettingSaved(F("RET=1 (ASCII)"), 5, accRetractOn);
    return true;
  }
  if (cmd == "RET0" || cmd == "ret0") {
    accRetractOn = 0;
    EEPROM.put(5, accRetractOn);
    notifySettingSaved(F("RET=0 (ASCII)"), 5, accRetractOn);
    return true;
  }
  if (cmd == "PWR1") {
    powerOnFlip = 1;
    EEPROM.put(9, 1);
    notifySettingSaved(F("PWR=1 (ASCII)"), 9, powerOnFlip);
    return true;
  }
  if (cmd == "PWR0") {
    powerOnFlip = 0;
    EEPROM.put(9, 0);
    notifySettingSaved(F("PWR=0 (ASCII)"), 9, powerOnFlip);
    return true;
  }
  if (cmd == "STD1") {
    stallDetectOn = 1;
    EEPROM.put(29, stallDetectOn);
    notifySettingSaved(F("STD=1 (ASCII)"), 29, stallDetectOn);
    return true;
  }
  if (cmd == "STD0") {
    stallDetectOn = 0;
    EEPROM.put(29, stallDetectOn);
    notifySettingSaved(F("STD=0 (ASCII)"), 29, stallDetectOn);
    return true;
  }

  /* 中文命令 */
  if (cmd == "打开收回") {
    accRetractOn = 1;
    EEPROM.put(5, accRetractOn);
    notifySettingSaved(F("RET=1 打开收回"), 5, accRetractOn);
    return true;
  }
  if (cmd == "关闭收回") {
    accRetractOn = 0;
    EEPROM.put(5, accRetractOn);
    notifySettingSaved(F("RET=0 关闭收回"), 5, accRetractOn);
    return true;
  }
  if (cmd == "开启自检") {
    selfCheckOn = 1;
    EEPROM.put(7, selfCheckOn);
    notifySettingSaved(F("CHK=1 开启自检"), 7, selfCheckOn);
    return true;
  }
  if (cmd == "关闭自检") {
    selfCheckOn = 0;
    EEPROM.put(7, selfCheckOn);
    notifySettingSaved(F("CHK=0 关闭自检"), 7, selfCheckOn);
    return true;
  }
  if (cmd == "开机上翻") {
    powerOnFlip = 0;
    EEPROM.put(9, 0);
    notifySettingSaved(F("PWR=0 开机上翻"), 9, powerOnFlip);
    return true;
  }
  if (cmd == "开机下翻") {
    powerOnFlip = 1;
    EEPROM.put(9, 1);
    notifySettingSaved(F("PWR=1 开机下翻"), 9, powerOnFlip);
    return true;
  }
  if (cmd == "开启堵转检测") {
    stallDetectOn = 1;
    EEPROM.put(29, stallDetectOn);
    notifySettingSaved(F("STD=1 开启堵转检测"), 29, stallDetectOn);
    return true;
  }
  if (cmd == "关闭堵转检测") {
    stallDetectOn = 0;
    EEPROM.put(29, stallDetectOn);
    notifySettingSaved(F("STD=0 关闭堵转检测"), 29, stallDetectOn);
    return true;
  }
  if (cmd == "允许按钮退出") {
    stealthBtnExitOn = 1;
    EEPROM.put(28, stealthBtnExitOn);
    blinkRed(2, 80, 80);
    notifySettingSaved(F("STB=1 允许按钮退出"), 28, stealthBtnExitOn);
    return true;
  }
  if (cmd == "禁止按钮退出") {
    stealthBtnExitOn = 0;
    EEPROM.put(28, stealthBtnExitOn);
    blinkRed(2, 80, 80);
    notifySettingSaved(F("STB=0 禁止按钮退出"), 28, stealthBtnExitOn);
    return true;
  }
  if (cmd.startsWith("延时断电")) {
    int dpoMin = cmd.substring(12).toInt();
    if (dpoMin > DELAY_PWR_MIN_MAX) dpoMin = DELAY_PWR_MIN_MAX;
    delayPowerOffMin = dpoMin;
    EEPROM.put(15, delayPowerOffMin);
    notifySettingSaved(F("DPO"), 15, delayPowerOffMin);
    return true;
  }
  if (cmd.startsWith("调速")) {
    int spdPct = cmd.substring(6).toInt();
    if (spdPct < SERVO_SPEED_MIN_PCT) spdPct = SERVO_SPEED_MIN_PCT;
    if (spdPct > SERVO_SPEED_MAX_PCT) spdPct = SERVO_SPEED_MAX_PCT;
    userServoSpeed = (uint8_t)spdPct;
    EEPROM.put(25, userServoSpeed);
    notifySettingSaved(F("SPD"), 25, userServoSpeed);
    return true;
  }

  return false;
}

/* 打开/折叠角度、翻板等：仅日志 + 绿灯，不测高/不驱动舵机 */
static bool handleMotionTestCmd(String cmd) {
  if (cmd == "往上收" || cmd == "往下" || cmd == "完全打开" || cmd == "自定义功能") {
    Serial.print(F("OK OPEN_ANGLE:"));
    Serial.println(cmd);
    blinkGreen(1);
    return true;
  }
  if (cmd == "调整折叠角度" || cmd == "调大" || cmd == "调小" || cmd == "初始化角度") {
    Serial.print(F("OK FOLD:"));
    Serial.println(cmd);
    blinkGreen(1);
    return true;
  }
  if (cmd == "打开" || cmd == "关闭") {
    Serial.print(F("OK FLAP:"));
    Serial.println(cmd);
    blinkGreen(1);
    forceStatus = 1;
    return true;
  }
  return false;
}

static void dispatchBleRxCmd() {
  trimBleCmd(bleRxStr);
  if (bleRxStr.length() == 0) {
    bleRxStr = "";
    return;
  }
  /* 过滤 ANG: 状态包（蓝牙模块可能回环本机发出的状态行） */
  if (bleRxStr.startsWith("ANG:")) {
    bleRxStr = "";
    return;
  }

  Serial.print(F("RX:"));
  Serial.println(bleRxStr);

  if (handleBlePersistSetting(bleRxStr)) {
    bleRxStr = "";
    return;
  }
  if (handleMotionTestCmd(bleRxStr)) {
    bleRxStr = "";
    return;
  }

  Serial.print(F("IGNORE:"));
  Serial.println(bleRxStr);
  bleRxStr = "";
}

/* 蓝牙接收：与 f3_max_servo pollBleSerial 对齐（# 立即派发 + 100ms 超时兜底） */
static void pollBle() {
  while (bleSerial.available()) {
    char c = bleSerial.read();
    if (c == '\r' || c == '\n') {
      if (bleRxStr.length() > 0) lastBleRxTime = 0;
      continue;
    }
    if (c == '#') {
      bleRxStr += c;
      dispatchBleRxCmd();
      continue;
    }
    bleRxStr += c;
    lastBleRxTime = millis();
  }

  if (bleRxStr.length() > 0 && millis() - lastBleRxTime > bleRxTimeout) {
    dispatchBleRxCmd();
  }
}

/* USB 监视器也可直接敲中文命令（回车结束），不经过蓝牙，便于台架单测 */
static void pollUsbInject() {
  static String usbBuf = "";
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\r') continue;
    if (c == '\n') {
      if (usbBuf.length() > 0) {
        bleRxStr = usbBuf;
        dispatchBleRxCmd();
        usbBuf = "";
      }
      return;
    }
    usbBuf += c;
  }
}

void setup() {
  pinMode(F3_PIN_LED_RED, OUTPUT);
  pinMode(F3_PIN_LED_GREEN, OUTPUT);
  pinMode(2, INPUT);
  pinMode(5, INPUT_PULLUP);
  digitalWrite(F3_PIN_LED_RED, LOW);
  digitalWrite(F3_PIN_LED_GREEN, LOW);

  Serial.begin(9600);
  bleSerial.begin(115200);
  delay(300);

  loadSettings();
  usbLn(F("=== F3 ADV CFG TEST ==="));
  printBootSettings();
  usbLn(F("USB=9600 BLE=115200 D6RX D7TX"));
  usbLn(F("支持: 打开/关闭收回 开机上/下翻 开启/关闭堵转检测 开启/关闭自检"));
  usbLn(F("      允许/禁止按钮退出 延时断电{分} 调速{%}"));
  usbLn(F("角度/翻板(仅日志): 往上收/往下/完全打开/自定义功能 调整折叠角度 调大/调小 打开/关闭"));
  usbLn(F("USB 直测: 监视器输入 RET1 / RET0 / PWR1 / STD1 回车"));
  usbLn(F("         或中文命令回车 (不经蓝牙)"));
  blinkGreen(3);
  usbLn(F("BOOT LED test: green x3 (D10) — 没闪则检查灯脚"));
  forceStatus = 1;
}

void loop() {
  pollUsbInject();
  pollBle();

  unsigned long now = millis();
  if (forceStatus || now - lastStatusMs >= 2500UL) {
    publishBleStatus();
  }
}
