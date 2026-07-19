#include <EEPROM.h>
#include <VarSpeedServo.h>
#include <SoftwareSerial.h>
#include <OneButton.h>

#define SERVO_MOTION_PIN 11
#define SERVO_PIN 4
const unsigned long STEALTH_KEY_OFF_MS = 7200000UL; // 2 hours

unsigned long stealthKeyOffAt = 0;
uint8_t stealthPin9Cut = 0;
uint8_t servoAttached = 0;
uint8_t stealthHoldReady = 0;
int flapTrackItem = -1;
int flapTrackAngle = -1;
unsigned long flapSettleUntil = 0;

volatile int item;
volatile int sysTime;
volatile int avgVal;
volatile int numVal;
volatile int judgeVal;
String shuju;
volatile int bianlaing;
volatile int fullOpenAngle;
volatile int customAngle;
volatile int item4;
volatile char receivedChar;
volatile int accRetractOn;
volatile int retractAngle;
volatile unsigned long lastReceiveTime;
volatile unsigned long timeout;
volatile int y;
volatile int selfCheckOn;
volatile int p;
volatile int powerOnFlip;
volatile long runDuration;
volatile int isRunning;
volatile int stuckCount;
volatile long jc;
volatile int singleExec;
volatile int n;
VarSpeedServo servo;
SoftwareSerial mySerial(6,7);
OneButton button5(5,true);

void servoMotionOn() {
  digitalWrite(SERVO_MOTION_PIN, HIGH);
}

void servoMotionOff() {
  digitalWrite(SERVO_MOTION_PIN, LOW);
}

void servoWriteDelay(int angle, unsigned long ms) {
  servoAttach();
  servoMotionOn();
  servo.write(angle);
  if (ms > 0) {
    delay(ms);
  }
  servoMotionOff();
}

void servoAttach() {
  if (!servoAttached) {
    servo.attach(SERVO_PIN);
    servoAttached = 1;
  }
}

void servoStopPwm() {
  servo.stop();
  if (servoAttached) {
    servo.detach();
    servoAttached = 0;
  }
  servoMotionOff();
}

unsigned long flapMoveSettleMs(int fromAngle, int toAngle) {
  unsigned long ms = (unsigned long)abs(toAngle - fromAngle) * 28UL + 400UL;
  if (ms < 400UL) ms = 400UL;
  if (ms > 2500UL) ms = 2500UL;
  return ms;
}

void flapServoHold(int target) {
  if (flapTrackItem == item && flapTrackAngle == target && !servoAttached && flapSettleUntil == 0) {
    return;
  }

  if (flapTrackItem != item || flapTrackAngle != target) {
    servoAttach();
    servoMotionOn();
    int start = servo.read();
    flapSettleUntil = millis() + flapMoveSettleMs(start, target);
    servo.write(target);
    flapTrackItem = item;
    flapTrackAngle = target;
    return;
  }

  if (flapSettleUntil != 0 && (long)(millis() - flapSettleUntil) < 0) {
    servoAttach();
    servoMotionOn();
    return;
  }

  servoStopPwm();
  flapSettleUntil = 0;
}

void stealthEnterHold() {
  if (stealthHoldReady) return;

  if (flapTrackItem == 3 && flapTrackAngle == item4 && !servoAttached && flapSettleUntil == 0) {
    stealthHoldReady = 1;
    return;
  }

  flapServoHold(item4);
}

void attachClick5() {
  item = item + 1;
  judgeVal = 1;
  n = 1;
  singleExec = 0;
}

void attachDuringLongPress5() {
  item = 3;
  stealthKeyOffAt = 0;
  stealthHoldReady = 0;
  flapTrackItem = -1;
  for (int i = 1; i <= 3; i = i + (1)) {
    digitalWrite(8,HIGH);
    delay(300);
    digitalWrite(8,LOW);
    delay(300);
  }
}

void judgeProgram() {
  if (singleExec == 0) {
    runDuration = 0;
    stuckCount = 0;
    isRunning = 0;
    singleExec = 1;

  }
  if (runDuration < 2500) {
    runDuration = runDuration + 1;

  }
  //判断是否运转
  if (n == 1) {
    if (runDuration < 1000) {
      if (analogRead(A0) < 1000) {
        isRunning = 2;

      }

    }
    if (runDuration > 1000) {
      if (isRunning != 2) {
        while (true) {
          digitalWrite(9,LOW);
          digitalWrite(8,HIGH);
          delay(300);
          digitalWrite(8,LOW);
          delay(300);
          digitalWrite(8,HIGH);
          delay(300);
          digitalWrite(8,LOW);
          delay(300);
          digitalWrite(8,LOW);
          delay(1000);
        }

      }

    }
    //判断卡住
    if (runDuration < 1000) {
      Serial.println(analogRead(A0));
      if (analogRead(A0) <= 760) {
        stuckCount = stuckCount + 1;
        delay(50);

      }
      if (stuckCount > 10) {
        Serial.println(analogRead(A0));
        while (true) {
          digitalWrite(9,LOW);
          digitalWrite(8,HIGH);
          delay(300);
          digitalWrite(8,LOW);
          delay(300);
          digitalWrite(8,HIGH);
          delay(300);
          digitalWrite(8,LOW);
          delay(300);
          digitalWrite(8,HIGH);
          delay(300);
          digitalWrite(8,LOW);
          delay(300);
          digitalWrite(8,LOW);
          delay(1500);
        }

      }

    }

  }
}

void setup(){
  Serial.begin(9600);
  mySerial.begin(115200);
  item = 0;
  sysTime = 0;
  avgVal = 0;
  numVal = 0;
  judgeVal = 0;
  shuju = "";
  bianlaing = 0;
  fullOpenAngle = 80;
  customAngle = 110;
  item4 = 0;
  receivedChar = 0;
  accRetractOn = 0;
  retractAngle = 0;
  lastReceiveTime = 0;
  timeout = 100;
  y = 0;
  selfCheckOn = 0;
  p = 0;
  powerOnFlip = 0;
  runDuration = 0;
  isRunning = 1;
  stuckCount = 0;
  jc = 0;
  singleExec = 0;
  n = 0;
  pinMode(8, OUTPUT);
  pinMode(5, INPUT);
  EEPROM.get(1, bianlaing);
  EEPROM.get(3, item4);
  EEPROM.get(5, accRetractOn);
  EEPROM.get(7, selfCheckOn);
  EEPROM.get(9, powerOnFlip);
  Serial.println(bianlaing);
  servo.attach(SERVO_PIN);
  servoAttached = 1;
  if (powerOnFlip == 0) {
    servo.write(item4);
    item = 0;

  } else if (powerOnFlip == 1) {
    servo.write(bianlaing);
    item = 1;
    delay(1500);
    for (int i = 1; i <= 6; i = i + (1)) {
      digitalWrite(8,HIGH);
      delay(200);
      digitalWrite(8,LOW);
      delay(200);
      if (digitalRead(5) == 0) {
        digitalWrite(8,LOW);
        item = 0;
        y = 2;
        servo.write(item4);
        delay(1500);
        break;

      }
    }
  }
  if (selfCheckOn == 1) {
    for (int i = 1; i <= 5; i = i + (1)) {
      digitalWrite(8,HIGH);
      delay(500);
      digitalWrite(8,LOW);
      delay(500);
      p = p + 1;
      if (digitalRead(5) == 0) {
        p = 0;
        break;

      }
    }
    if (p == 5) {
      for (int i = 1; i <= 4; i = i + (1)) {
        digitalWrite(8,HIGH);
        delay(100);
        digitalWrite(8,LOW);
        delay(100);
      }

    }
    if (p == 0) {
      servo.write(bianlaing);
      delay(1500);
      servo.write(item4);
      delay(1200);
      Serial.println(analogRead(A0));
      if (analogRead(A0) < 980) {
        Serial.println(analogRead(A0));
        servo.stop();
        while (true) {
          digitalWrite(8,HIGH);
          delay(500);
          digitalWrite(8,LOW);
          delay(500);
        }

      }
      delay(1000);

    }

  }
  button5.attachClick(attachClick5);
  button5.attachDuringLongPress(attachDuringLongPress5);
  pinMode(9, OUTPUT);
  pinMode(SERVO_MOTION_PIN, OUTPUT);
  pinMode(2, INPUT);
  digitalWrite(9, HIGH);
  digitalWrite(SERVO_MOTION_PIN, LOW);
}

void loop(){
  button5.tick();
  button5.tick();
  if (mySerial.available()) {
    receivedChar = mySerial.read();
    shuju += receivedChar;
    lastReceiveTime = millis();

  }
  if ((shuju.length() > 0 && millis() - lastReceiveTime > timeout)) {
    Serial.println(shuju);
    shuju = "";

  }

  if (shuju == "自动调平") {
    servoWriteDelay(120, 1500);
    Serial.println(analogRead(A0));
    for (int t = 120; t <= 180; t = t + (1)) {
      servoWriteDelay(t, 500);
      Serial.println(analogRead(A0));
      if (analogRead(A0) < 850) {
        y = t;
        Serial.println(t);
        break;

      }
      if (t == 180) {
        y = 180;

      }
    }
    y = y - 10;
    for (int u = (y); u <= (180); u = u + (1)) {
      Serial.println(u);
      servoWriteDelay(u, 500);
      Serial.println(analogRead(A0));
      if (analogRead(A0) < 860) {
        Serial.println(y);
        item4 = u - 3;
        EEPROM.put(3, item4);
        break;

      }
      if (u == 180) {
        item4 = 180;
        EEPROM.put(3, item4);
        delay(300);

      }
    }
    y = 0;
    servo.write(90);
    for (int f = 90; f >= 0; f = f + (-1)) {
      servoWriteDelay(f, 500);
      if (analogRead(A0) < 870) {
        Serial.println(f);
        y = f;
        break;

      }
      if (f == 0) {
        y = 0;

      }
    }
    y = y + 10;
    for (int m = (y); m >= (0); m = m + (-1)) {
      Serial.println(m);
      servoWriteDelay(m, 500);
      if (analogRead(A0) < 870) {
        Serial.println("abb");
        bianlaing = m;
        servoWriteDelay(bianlaing, 300);
        EEPROM.put(1, bianlaing);
        break;

      }
      if (m == 0) {
        delay(300);
        bianlaing = 0;
        servo.write(bianlaing);
        Serial.println("hello");
        EEPROM.put(1, bianlaing);

      }
    }
    Serial.println("iii");

  } else if (shuju == "打开收回") {
    accRetractOn = 1;
    EEPROM.put(5, accRetractOn);
    for (int i = 1; i <= 3; i = i + (1)) {
      digitalWrite(8,HIGH);
      delay(100);
      digitalWrite(8,LOW);
      delay(100);
    }
    shuju = "";
  } else if (shuju == "关闭收回") {
    accRetractOn = 0;
    EEPROM.put(5, accRetractOn);
    for (int i = 1; i <= 3; i = i + (1)) {
      digitalWrite(8,HIGH);
      delay(100);
      digitalWrite(8,LOW);
      delay(100);
    }
    shuju = "";
  } else if (shuju == "开启自检") {
    selfCheckOn = 1;
    EEPROM.put(7, selfCheckOn);
    for (int i = 1; i <= 3; i = i + (1)) {
      digitalWrite(8,HIGH);
      delay(100);
      digitalWrite(8,LOW);
      delay(100);
    }
    shuju = "";
  } else if (shuju == "开机上翻") {
    for (int i = 1; i <= 3; i = i + (1)) {
      digitalWrite(8,HIGH);
      delay(100);
      digitalWrite(8,LOW);
      delay(100);
    }
    powerOnFlip = 0;
    EEPROM.put(9, 0);
    shuju = "";
  } else if (shuju == "开机下翻") {
    for (int i = 1; i <= 3; i = i + (1)) {
      digitalWrite(8,HIGH);
      delay(100);
      digitalWrite(8,LOW);
      delay(100);
    }
    powerOnFlip = 1;
    EEPROM.put(9, 1);
    shuju = "";
  } else if (shuju == "关闭自检") {
    selfCheckOn = 0;
    EEPROM.put(7, selfCheckOn);
    for (int i = 1; i <= 3; i = i + (1)) {
      digitalWrite(8,HIGH);
      delay(100);
      digitalWrite(8,LOW);
      delay(100);
    }
    shuju = "";
  } else if (shuju == "往上收") {
    if (servo.read() > 180) {
      bianlaing = 180;
      shuju = "";
      EEPROM.put(1, bianlaing);

    } else {
      bianlaing = bianlaing + 2;
      servo.write(bianlaing);
      shuju = "";
      delay(300);
      EEPROM.put(1, bianlaing);

    }
  } else if (shuju == "往下") {
    if (servo.read() < 0) {
      bianlaing = 0;
      shuju = "";
      EEPROM.put(1, bianlaing);

    } else {
      bianlaing = bianlaing - 2;
      servo.write(bianlaing);
      shuju = "";
      delay(300);
      EEPROM.put(1, bianlaing);

    }
  } else if (shuju == "完全打开") {
    bianlaing = fullOpenAngle;
    servo.write(bianlaing);
    delay(300);
    shuju = "";
    EEPROM.put(1, bianlaing);
  } else if (shuju == "自定义功能") {
    bianlaing = customAngle;
    servo.write(bianlaing);
    delay(300);
    shuju = "";
    EEPROM.put(1, bianlaing);
  } else if (shuju == "初始化角度") {
    item4 = 150;
    servo.write(item4);
    delay(300);
    shuju = "";
    EEPROM.put(3, item4);
  } else if (shuju == "调整折叠角度") {
    // 进入调角专用循环前先清空，否则后续「调大/调小」会拼成「调整折叠角度调大」永远匹配不上
    shuju = "";
    lastReceiveTime = 0;
    digitalWrite(8, HIGH);
    // 正常运行后 flapServoHold 会 detach + 关 Pin11，这里必须重新上电再写角
    servoAttach();
    servoMotionOn();
    servo.write(item4);
    while (true) {
      digitalWrite(8, HIGH);
      digitalWrite(9, LOW);
      if (mySerial.available()) {
        receivedChar = mySerial.read();
        shuju += receivedChar;
        lastReceiveTime = millis();
      }
      if (shuju.length() > 0 && millis() - lastReceiveTime > timeout) {
        // 先判定完整指令，再清空（旧逻辑先清空会导致偶发丢「调大/调小」）
        if (shuju == "调大") {
          if (item4 > 0) {
            item4 = item4 - 1;
            servoAttach();
            servoMotionOn();
            servo.write(item4);
            delay(300);
            EEPROM.put(3, item4);
          }
        } else if (shuju == "调小") {
          if (item4 < 180) {
            item4 = item4 + 1;
            servoAttach();
            servoMotionOn();
            servo.write(item4);
            delay(300);
            EEPROM.put(3, item4);
          }
        }
        shuju = "";
      }
    }
  }

  Serial.println(analogRead(A0));
  if (item == 0) {
    digitalWrite(8,LOW);
    flapServoHold(item4);
    if (selfCheckOn == 1) {
      judgeProgram();

    }

  } else if (item == 1) {
    digitalWrite(8,HIGH);
    flapServoHold(bianlaing);
    if (selfCheckOn == 1) {
      judgeProgram();

    }
  } else if (item == 2) {
    item = 0;
    flapTrackItem = -1;
  } else if (item == 3) {
    digitalWrite(9,HIGH);
    while (true) {
      stealthEnterHold();
      if (digitalRead(2) == 0) {
        if (stealthKeyOffAt == 0) {
          stealthKeyOffAt = millis() + STEALTH_KEY_OFF_MS;
        }
        if ((long)(millis() - stealthKeyOffAt) >= 0) {
          digitalWrite(9,LOW);
          stealthPin9Cut = 1;
          item = 0;
          jc = 0;
          stealthKeyOffAt = 0;
          stealthHoldReady = 0;
          flapTrackItem = -1;
          break;
        }
      } else {
        stealthKeyOffAt = 0;
      }
      if (digitalRead(5) == 0) {
        jc = jc + 1;
        Serial.println(jc);
        if (digitalRead(5) == 1) {
          jc = 0;

        }
        if (jc == 1300) {
          for (int i = 1; i <= 5; i = i + (1)) {
            digitalWrite(8,HIGH);
            delay(300);
            digitalWrite(8,LOW);
            delay(300);
            item = 0;
          }
          digitalWrite(9,LOW);
          stealthKeyOffAt = 0;
          stealthHoldReady = 0;
          flapTrackItem = -1;
          break;

        }

      }
    }
  }
  if (stealthPin9Cut) {
    digitalWrite(9,LOW);
  } else if (accRetractOn == 1) {
    digitalWrite(9,HIGH);
    if (digitalRead(2) == 0) {
      Serial.println("hello");
      servoAttach();
      servo.write(item4);
      delay(1500);
      servoStopPwm();
      digitalWrite(9,LOW);
      delay(100);
      sysTime = sysTime + 1;
      if (sysTime == 6) {
        accRetractOn = 0;
        EEPROM.put(5, accRetractOn);
        for (int i = 1; i <= 3; i = i + (1)) {
          digitalWrite(8,HIGH);
          delay(100);
          digitalWrite(8,LOW);
          delay(100);
        }

      }

    }

  } else {
    if (digitalRead(2) == 0) {
      digitalWrite(9,LOW);
    } else {
      digitalWrite(9,HIGH);
    }

  }

  //（三套版本）
  //往上收
  //自动调平
  //往下
  //打开收回
  //关闭收回
  //完全打开
  //自定义功能
  //初始化角度
  //调整折叠角度
  //调大
  //调小

}
