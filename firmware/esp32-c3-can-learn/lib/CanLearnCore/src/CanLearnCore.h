#pragma once
#include <Arduino.h>

enum LearnStep { STEP_IDLE = 0, STEP_A, STEP_B, STEP_C, STEP_D, STEP_GEAR_VAL };
enum DeviceMode { MODE_IDLE = 0, MODE_LEARNING, MODE_RUNTIME };

struct FrameState {
  uint8_t data[8]{};
  uint8_t noise[8]{};
  bool seen = false;
};

struct PairDelta {
  uint16_t minVal = 0xFFFF;
  uint16_t maxVal = 0;
  uint16_t lastVal = 0;
  bool seen = false;
  uint32_t samples = 0;
  uint32_t changes = 0;
  uint32_t upCount = 0;
  uint32_t downCount = 0;
  uint32_t spikeCount = 0;
  uint32_t wrapCount = 0;
};

struct RuntimeConfig {
  bool valid = false;
  uint32_t gearId = 0;
  uint8_t gearOffset = 0;
  uint8_t gearValues[7]{};
  uint8_t gearCount = 0;
  uint32_t rpmId = 0;
  uint8_t rpmPairOffset = 0;
  bool rpmBigEndian = false;
  uint16_t rpmIdle = 0;
  uint16_t rpmRawMax = 0;
  uint16_t rpmMax = 8000;
  float rpmScale = 1.0f;
};

struct EndianPairDelta {
  PairDelta le[7];
  PairDelta be[7];
};

static inline bool jsonFindKey(const String &s, const char *key, int &valPos) {
  String pat = String("\"") + key + "\":";
  valPos = s.indexOf(pat);
  if (valPos < 0) return false;
  valPos += pat.length();
  while (valPos < (int)s.length() && s[valPos] == ' ') valPos++;
  return true;
}

static inline bool jsonGetLong(const String &s, const char *key, long &out) {
  int p;
  if (!jsonFindKey(s, key, p)) return false;
  out = s.substring(p).toInt();
  return true;
}

static inline bool jsonGetFloat(const String &s, const char *key, float &out) {
  int p;
  if (!jsonFindKey(s, key, p)) return false;
  out = s.substring(p).toFloat();
  return true;
}

static inline bool jsonGetString(const String &s, const char *key, String &out) {
  int p;
  if (!jsonFindKey(s, key, p)) return false;
  if (p >= s.length()) return false;
  if (s[p] == '"') {
    int end = s.indexOf('"', p + 1);
    if (end < 0) return false;
    out = s.substring(p + 1, end);
    return true;
  }
  int end = p;
  while (end < (int)s.length() && s[end] != ',' && s[end] != '}' && s[end] != ']') end++;
  out = s.substring(p, end);
  out.trim();
  return out.length() > 0;
}

static inline void jsonAppendBytes(String &s, const uint8_t *data, const uint8_t *noise) {
  s += ",\"data\":[";
  for (int i = 0; i < 8; i++) {
    if (i) s += ',';
    s += String(data[i]);
  }
  s += "],\"noise\":[";
  for (int i = 0; i < 8; i++) {
    if (i) s += ',';
    s += String(noise[i]);
  }
  s += ']';
}
