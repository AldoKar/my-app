// GeminiUsage - OLED face + servo demo for Feather ESP32-S2
// Uses Adafruit SSD1306 (I2C) and ESP32Servo

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <FluxGarage_RoboEyes.h>
#include <ESP32Servo.h>
#include <math.h>

// OLED configuration
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
RoboEyes<Adafruit_SSD1306> roboEyes(display);

// Default I2C pins (change if your Feather labels are different)
#ifndef I2C_SDA_PIN
#define I2C_SDA_PIN 21
#endif
#ifndef I2C_SCL_PIN
#define I2C_SCL_PIN 22
#endif

// Servo pins (change if needed)
const int SERVO_YAW_PIN = 19;   // horizontal axis (left/right)
const int SERVO_PITCH_PIN = 18; // vertical axis (up/down)

// Servo limits and neutral position (tune for your mechanical mount)
const int YAW_MIN = 40;
const int YAW_CENTER = 90;
const int YAW_MAX = 140;

const int PITCH_MIN = 55; // up
const int PITCH_CENTER = 90;
const int PITCH_MAX = 125; // down

const int SERVO_STEP_PER_TICK = 1; // smoothing speed
const unsigned long SERVO_TICK_MS = 15;

const unsigned long IDLE_START_MS = 4500;
const unsigned long IDLE_STEP_MS = 2200;

Servo servo1;
Servo servo2;

enum Mood
{
  MOOD_NEUTRAL,
  MOOD_HAPPY,
  MOOD_SAD,
  MOOD_SURPRISED,
  MOOD_WINK
};

bool textMode = false;
unsigned long textModeUntilMs = 0;

Mood currentMood = MOOD_NEUTRAL;

int currentYaw = YAW_CENTER;
int currentPitch = PITCH_CENTER;
int targetYaw = YAW_CENTER;
int targetPitch = PITCH_CENTER;

unsigned long lastInteractionMs = 0;
unsigned long lastServoTickMs = 0;
unsigned long lastIdleStepMs = 0;

void applyHeadTarget(int yaw, int pitch)
{
  targetYaw = constrain(yaw, YAW_MIN, YAW_MAX);
  targetPitch = constrain(pitch, PITCH_MIN, PITCH_MAX);
}

void lookCenter() { applyHeadTarget(YAW_CENTER, PITCH_CENTER); }
void lookLeft() { applyHeadTarget(YAW_MIN, PITCH_CENTER); }
void lookRight() { applyHeadTarget(YAW_MAX, PITCH_CENTER); }
void lookUp() { applyHeadTarget(YAW_CENTER, PITCH_MIN); }
void lookDown() { applyHeadTarget(YAW_CENTER, PITCH_MAX); }

void updateServosSmooth()
{
  if (millis() - lastServoTickMs < SERVO_TICK_MS)
    return;
  lastServoTickMs = millis();

  if (currentYaw < targetYaw)
    currentYaw = min(currentYaw + SERVO_STEP_PER_TICK, targetYaw);
  else if (currentYaw > targetYaw)
    currentYaw = max(currentYaw - SERVO_STEP_PER_TICK, targetYaw);

  if (currentPitch < targetPitch)
    currentPitch = min(currentPitch + SERVO_STEP_PER_TICK, targetPitch);
  else if (currentPitch > targetPitch)
    currentPitch = max(currentPitch - SERVO_STEP_PER_TICK, targetPitch);

  servo1.write(currentYaw);
  servo2.write(currentPitch);
}

void markInteraction()
{
  lastInteractionMs = millis();
}

void setMood(Mood m)
{
  textMode = false;
  currentMood = m;
  markInteraction();

  switch (m)
  {
  case MOOD_HAPPY:
    roboEyes.setMood(HAPPY);
    lookCenter();
    break;
  case MOOD_SAD:
    roboEyes.setMood(TIRED);
    lookDown();
    break;
  case MOOD_SURPRISED:
    roboEyes.setMood(DEFAULT);
    roboEyes.anim_confused();
    lookCenter();
    break;
  case MOOD_WINK:
    roboEyes.setMood(DEFAULT);
    roboEyes.close(true, false);
    roboEyes.open(true, false);
    applyHeadTarget(YAW_MIN + 8, PITCH_CENTER);
    break;
  case MOOD_NEUTRAL:
  default:
    roboEyes.setMood(DEFAULT);
    lookCenter();
    break;
  }
}

void runIdleBehavior()
{
  if (currentMood == MOOD_HAPPY)
    return;
  if (millis() - lastInteractionMs < IDLE_START_MS)
    return;
  if (millis() - lastIdleStepMs < IDLE_STEP_MS)
    return;

  lastIdleStepMs = millis();
  int pick = random(5);
  if (pick == 0)
  {
    lookLeft();
    roboEyes.setPosition(W);
  }
  else if (pick == 1)
  {
    lookRight();
    roboEyes.setPosition(E);
  }
  else if (pick == 2)
  {
    lookUp();
    roboEyes.setPosition(N);
  }
  else if (pick == 3)
  {
    lookDown();
    roboEyes.setPosition(S);
  }
  else
  {
    lookCenter();
    roboEyes.setPosition(DEFAULT);
  }
}

void runHappyMotion()
{
  if (currentMood != MOOD_HAPPY)
    return;

  // Soft cyclic movement while happy
  float t = millis() * 0.0045f;
  int yaw = YAW_CENTER + (int)(16.0f * sinf(t));
  int pitch = PITCH_CENTER + (int)(8.0f * sinf(t * 1.7f));
  applyHeadTarget(yaw, pitch);
}

String inputBuffer;

void handleSerialCommand(const String &cmd)
{
  if (cmd.length() == 0)
    return;
  // simple parsing: "mood happy" | "servo1 90" | "servo2 45" | "text Hello"
  if (cmd.startsWith("mood "))
  {
    String arg = cmd.substring(5);
    arg.trim();
    if (arg == "happy")
      setMood(MOOD_HAPPY);
    else if (arg == "sad")
      setMood(MOOD_SAD);
    else if (arg == "surprised")
      setMood(MOOD_SURPRISED);
    else if (arg == "wink")
      setMood(MOOD_WINK);
    else
      setMood(MOOD_NEUTRAL);
    return;
  }
  else if (cmd.startsWith("look "))
  {
    String arg = cmd.substring(5);
    arg.trim();
    if (arg == "left")
    {
      lookLeft();
      roboEyes.setPosition(W);
    }
    else if (arg == "right")
    {
      lookRight();
      roboEyes.setPosition(E);
    }
    else if (arg == "up")
    {
      lookUp();
      roboEyes.setPosition(N);
    }
    else if (arg == "down")
    {
      lookDown();
      roboEyes.setPosition(S);
    }
    else
    {
      lookCenter();
      roboEyes.setPosition(DEFAULT);
    }
    markInteraction();
    return;
  }
  else if (cmd.startsWith("servo1 "))
  {
    int v = cmd.substring(7).toInt();
    v = constrain(v, 0, 180);
    applyHeadTarget(v, targetPitch);
    markInteraction();
  }
  else if (cmd.startsWith("servo2 "))
  {
    int v = cmd.substring(7).toInt();
    v = constrain(v, 0, 180);
    applyHeadTarget(targetYaw, v);
    markInteraction();
  }
  else if (cmd.startsWith("text "))
  {
    String msg = cmd.substring(5);
    markInteraction();
    textMode = true;
    textModeUntilMs = millis() + 5500;
    display.clearDisplay();
    display.setTextSize(2);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println(msg);
    display.display();
  }
}

void setup()
{
  Serial.begin(115200);
  delay(100);
  Serial.println("GeminiUsage starting...");
  randomSeed((uint32_t)esp_random());

  // initialize I2C on chosen pins (SDA, SCL)
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Serial.print("I2C pins SDA=");
  Serial.print(I2C_SDA_PIN);
  Serial.print(" SCL=");
  Serial.println(I2C_SCL_PIN);

  // one-shot I2C scan to help verify wiring/address
  Serial.println("Scanning I2C bus...");
  byte error, address;
  int nDevices = 0;
  for (address = 1; address < 127; address++)
  {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    if (error == 0)
    {
      Serial.print("I2C device found at 0x");
      if (address < 16)
        Serial.print("0");
      Serial.print(address, HEX);
      Serial.println("  !");
      nDevices++;
    }
  }
  if (nDevices == 0)
    Serial.println("No I2C devices found. Check SDA/SCL wiring and power.");
  else
    Serial.print("Found "), Serial.print(nDevices), Serial.println(" device(s).");

  // init display
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C))
  {
    Serial.println("SSD1306 allocation failed");
    for (;;)
      ;
  }
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("Gemini Agent Ready");
  display.display();

  // Startup RoboEyes animation engine on top of this display
  roboEyes.begin(SCREEN_WIDTH, SCREEN_HEIGHT, 80);
  roboEyes.setPosition(DEFAULT);
  roboEyes.setAutoblinker(ON, 2, 2);
  roboEyes.setIdleMode(ON, 2, 2);
  roboEyes.open();

  // attach servos
  servo1.setPeriodHertz(50);
  servo2.setPeriodHertz(50);
  servo1.attach(SERVO_YAW_PIN);
  servo2.attach(SERVO_PITCH_PIN);
  currentYaw = YAW_CENTER;
  currentPitch = PITCH_CENTER;
  lookCenter();
  updateServosSmooth();
  setMood(MOOD_NEUTRAL);

  Serial.println("Commands:");
  Serial.println("  mood [happy|sad|surprised|wink|neutral]");
  Serial.println("  look [left|right|up|down|center]");
  Serial.println("  servo1 N (yaw 0..180), servo2 N (pitch 0..180)");
  Serial.println("  text MESSAGE");
}

void loop()
{
  runHappyMotion();
  runIdleBehavior();
  updateServosSmooth();

  if (!textMode)
  {
    roboEyes.update();
  }
  else if (millis() > textModeUntilMs)
  {
    textMode = false;
  }

  // read serial line
  while (Serial.available())
  {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r')
    {
      inputBuffer.trim();
      handleSerialCommand(inputBuffer);
      inputBuffer = "";
    }
    else
    {
      inputBuffer += c;
    }
  }
}
