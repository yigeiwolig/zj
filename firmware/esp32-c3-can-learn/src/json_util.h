#pragma once
#include <Arduino.h>

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

static inline bool jsonGetBool(const String &s, const char *key, bool &out) {
  int p;
  if (!jsonFindKey(s, key, p)) return false;
  if (s.substring(p).startsWith("true")) {
    out = true;
    return true;
  }
  if (s.substring(p).startsWith("false")) {
    out = false;
    return true;
  }
  return false;
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
