/**
 * Teensy logic for light strip and other things.
 *
 * author: Omar Barazanji
 **/

#include <FastLED.h>

FASTLED_USING_NAMESPACE

#if defined(FASTLED_VERSION) && (FASTLED_VERSION < 3001000)
#warning "Requires FastLED 3.1 or later; check github for latest code."
#endif

// #define DATA_PIN 22 
#define DATA_PIN 23
#define LED_TYPE WS2812B
#define COLOR_ORDER GRB
#define NUM_LEDS 300
CRGB leds[NUM_LEDS];
#define BRIGHTNESS 164
#define FRAMES_PER_SECOND 60
uint8_t gCurrentPatternNumber = 0; // Index number of which pattern is current
uint8_t gHue = 0;                  // rotating "base color" used by many of the patterns
uint8_t hue1 = 0;
uint8_t hue2 = 100;
uint8_t theta = 0;
uint8_t incomingByte;


void white()
{
  for (int i = 0; i < NUM_LEDS; i++)
  {
    leds[i] = CRGB::White;
  }
}

void green()
{
  for (int i = 0; i < NUM_LEDS; i++)
  {
    leds[i] = CRGB::Green;
  }
}

void orange()
{
  for (int i = 0; i < NUM_LEDS; i++)
  {
    leds[i] = CRGB::Orange;
  }
}

void blue()
{
  for (int i = 0; i < NUM_LEDS; i++)
  {
    leds[i] = CRGB::Blue;
  }
}

void red()
{
  for (int i = 0; i < NUM_LEDS; i++)
  {
    leds[i] = CRGB::Red;
  }
}

void yellow()
{
  for (int i = 0; i < NUM_LEDS; i++)
  {
    leds[i] = CRGB::Yellow;
  }
}

void purple()
{
  for (int i = 0; i < NUM_LEDS; i++)
  {
    leds[i] = CRGB::Purple;
  }
}

void gradient()
{
  // At note off, Fade the LEDs off
  CHSV c1;
  hue1 = constrain(sin8(theta), 10, 200) ;
  c1.hue = hue1;
  c1.sat = 255;
  c1.val = 210;
  
  CHSV c2;
  hue2 = constrain(cos8(theta), 50, 150) ;
  c1.hue = hue2;
  c1.sat = 255;
  c1.val = 200;
  fill_gradient(leds, NUM_LEDS, c1, c2);
  
}

void rainbow()
{
  // FastLED's built-in rainbow generator
  fill_rainbow(leds, NUM_LEDS, gHue, 7);
}

void fadeToBlack()
{
  // At note off, Fade the LEDs off
  fadeToBlackBy(leds, NUM_LEDS, 60);
}

void confetti()
{
  // random colored speckles that blink in and fade smoothly
  fadeToBlackBy(leds, NUM_LEDS, 10);
  int pos = random16(NUM_LEDS);
  leds[pos] += CHSV(gHue + random8(64), 200, 255);
}

void sinelon()
{
  // a colored dot sweeping back and forth, with fading trails
  fadeToBlackBy(leds, NUM_LEDS, 20);
  int pos = beatsin16(13, 0, NUM_LEDS - 1);
  leds[pos] += CHSV(gHue, 255, 192);
}

void bpm()
{
  // colored stripes pulsing at a defined Beats-Per-Minute (BPM)
  uint8_t BeatsPerMinute = 62;
  CRGBPalette16 palette = PartyColors_p;
  uint8_t beat = beatsin8(BeatsPerMinute, 64, 255);
  for (int i = 0; i < NUM_LEDS; i++)
  { // 9948
    leds[i] = ColorFromPalette(palette, gHue + (i * 2), beat - gHue + (i * 10));
  }
}

void juggle()
{
  // eight colored dots, weaving in and out of sync with each other
  fadeToBlackBy(leds, NUM_LEDS, 20);
  byte dothue = 0;
  for (int i = 0; i < 8; i++)
  {
    leds[beatsin16(i + 7, 0, NUM_LEDS - 1)] |= CHSV(dothue, 200, 255);
    dothue += 32;
  }
}

void setup()
{
  Serial.begin(9600);
  delay(1);

  FastLED.addLeds<1, LED_TYPE, DATA_PIN, COLOR_ORDER>(leds, NUM_LEDS);

  // set master brightness control
  FastLED.setBrightness(BRIGHTNESS);
}

// List of patterns to cycle through.  Each is defined as a separate function below.
typedef void (*SimplePatternList[])();
SimplePatternList gPatterns = {rainbow, fadeToBlack, confetti, sinelon, juggle, bpm, white, green, orange, blue, red, yellow, purple, gradient};

void loop()
{

  EVERY_N_MILLISECONDS(FRAMES_PER_SECOND / 2)
  {
    // Call the current pattern function once, updating the 'leds' array
    gPatterns[gCurrentPatternNumber]();
    FastLED.show();
  }

  //theta incremementer for sin
  EVERY_N_MILLISECONDS(300) {theta++;}
  EVERY_N_MILLISECONDS(FRAMES_PER_SECOND)
  {
    gHue++;
  }
  if (Serial.available())
  {
    incomingByte = Serial.read();
    if (incomingByte == 0x00)
    {
      gCurrentPatternNumber = 0; // rainbow
    }
    if (incomingByte == 0x01)
    {
      gCurrentPatternNumber = 1; // fadeToBlack
    }
    if (incomingByte == 0x02)
    {
      gCurrentPatternNumber = 2; // confetti
    }
    if (incomingByte == 0x03)
    {
      gCurrentPatternNumber = 3; // sinelon
    }
    if (incomingByte == 0x04)
    {
      gCurrentPatternNumber = 4; // juggle
    }
    if (incomingByte == 0x05)
    {
      gCurrentPatternNumber = 5; // bpm
    }
    if (incomingByte == 0x06)
    {
      gCurrentPatternNumber = 6; // white
    }
    if (incomingByte == 0x07)
    {
      gCurrentPatternNumber = 7; // green
    }
    if (incomingByte == 0x08)
    {
      gCurrentPatternNumber = 8; // orange
    }
    if (incomingByte == 0x09)
    {
      gCurrentPatternNumber = 9; // blue
    }
    if (incomingByte == 0x0A)
    {
      gCurrentPatternNumber = 10; // red
    }
    if (incomingByte == 0x0B)
    {
      gCurrentPatternNumber = 11; // yellow
    }
    if (incomingByte == 0x0C)
    {
      gCurrentPatternNumber = 12; // purple
    }
    if (incomingByte == 0x0D)
    {
      gCurrentPatternNumber = 13; // gradient
    }

    if (incomingByte == 0xF0)
    {
      FastLED.setBrightness(5);
    }
    if (incomingByte == 0xF1)
    {
      FastLED.setBrightness(10);
    }
    if (incomingByte == 0xF2)
    {
      FastLED.setBrightness(20);
    }
    if (incomingByte == 0xF3)
    {
      FastLED.setBrightness(30);
    }
    if (incomingByte == 0xF4)
    {
      FastLED.setBrightness(40);
    }
    if (incomingByte == 0xF5)
    {
      FastLED.setBrightness(50);
    }
    if (incomingByte == 0xF6)
    {
      FastLED.setBrightness(60);
    }
    if (incomingByte == 0xF7)
    {
      FastLED.setBrightness(70);
    }
    if (incomingByte == 0xF8)
    {
      FastLED.setBrightness(80);
    }
    if (incomingByte == 0xF9)
    {
      FastLED.setBrightness(85);
    }
    if (incomingByte == 0xFA)
    {
      FastLED.setBrightness(88);
    }
  }
}

#define ARRAY_SIZE(A) (sizeof(A) / sizeof((A)[0]))
void nextPattern()
{
  // add one to the current pattern number, and wrap around at the end
  gCurrentPatternNumber = (gCurrentPatternNumber + 1) % ARRAY_SIZE(gPatterns);
}
