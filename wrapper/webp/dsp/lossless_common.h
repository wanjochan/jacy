// Copyright 2012 Google Inc. All Rights Reserved.
//
// Use of this source code is governed by a BSD-style license
// that can be found in the COPYING file in the root of the source
// tree. An additional intellectual property rights grant can be found
// in the file PATENTS. All contributing project authors may
// be found in the AUTHORS file in the root of the source tree.
// -----------------------------------------------------------------------------
//
// Image transforms and color space conversion methods for lossless decoder.
//
// Authors: Vikas Arora (vikaas.arora@gmail.com)
//          Jyrki Alakuijala (jyrki@google.com)
//          Vincent Rabaud (vrabaud@google.com)

#ifndef WEBP_DSP_LOSSLESS_COMMON_H_
#define WEBP_DSP_LOSSLESS_COMMON_H_

#include "../webp/types.h"

#include "../utils/utils.h"

#ifdef __cplusplus
extern "C" {
#endif

//------------------------------------------------------------------------------
// Decoding

// color mapping related functions.
static WEBP_INLINE uint32_t DEDUP_vP8_GetARGBIndex(uint32_t idx) {
  return (idx >> 8) & 0xff;
}

static WEBP_INLINE uint8_t DEDUP_vP8_GetAlphaIndex(uint8_t idx) {
  return idx;
}

static WEBP_INLINE uint32_t DEDUP_vP8_GetARGBValue(uint32_t val) {
  return val;
}

static WEBP_INLINE uint8_t DEDUP_vP8_GetAlphaValue(uint32_t val) {
  return (val >> 8) & 0xff;
}

//------------------------------------------------------------------------------
// Misc methods.

// Computes sampled size of 'size' when sampling using 'sampling bits'.
static WEBP_INLINE uint32_t DEDUP_vP8_LSubSampleSize(uint32_t size,
                                              uint32_t sampling_bits) {
  return (size + (1 << sampling_bits) - 1) >> sampling_bits;
}

// Converts near lossless quality into max number of bits shaved off.
static WEBP_INLINE int DEDUP_vP8_LNearLosslessBits(int near_lossless_quality) {
  //    100 -> 0
  // 80..99 -> 1
  // 60..79 -> 2
  // 40..59 -> 3
  // 20..39 -> 4
  //  0..19 -> 5
  return 5 - near_lossless_quality / 20;
}

// -----------------------------------------------------------------------------
// Faster logarithm for integers. Small values use a look-up table.

// The threshold till approximate version of log_2 can be used.
// Practically, we can get rid of the call to log() as the two values match to
// very high degree (the ratio of these two is 0.99999x).
// Keeping a high threshold for now.
#define APPROX_LOG_WITH_CORRECTION_MAX  65536
#define APPROX_LOG_MAX                   4096
#define LOG_2_RECIPROCAL 1.44269504088896338700465094007086
#define LOG_LOOKUP_IDX_MAX 256
extern const float kLog2Table[LOG_LOOKUP_IDX_MAX];
extern const float kSLog2Table[LOG_LOOKUP_IDX_MAX];
typedef float (*DEDUP_vP8_LFastLog2SlowFunc)(uint32_t v);

extern DEDUP_vP8_LFastLog2SlowFunc DEDUP_vP8_LFastLog2Slow;
extern DEDUP_vP8_LFastLog2SlowFunc DEDUP_vP8_LFastSLog2Slow;

static WEBP_INLINE float DEDUP_vP8_LFastLog2(uint32_t v) {
  return (v < LOG_LOOKUP_IDX_MAX) ? kLog2Table[v] : DEDUP_vP8_LFastLog2Slow(v);
}
// Fast calculation of v * log2(v) for integer input.
static WEBP_INLINE float DEDUP_vP8_LFastSLog2(uint32_t v) {
  return (v < LOG_LOOKUP_IDX_MAX) ? kSLog2Table[v] : DEDUP_vP8_LFastSLog2Slow(v);
}

// -----------------------------------------------------------------------------
// PrefixEncode()

static WEBP_INLINE int DEDUP_vP8_LBitsLog2Ceiling(uint32_t n) {
  const int log_floor = BitsLog2Floor(n);
  if (n == (n & ~(n - 1))) {  // zero or a power of two.
    return log_floor;
  }
  return log_floor + 1;
}

// Splitting of distance and length codes into prefixes and
// extra bits. The prefixes are encoded with an entropy code
// while the extra bits are stored just as normal bits.
static WEBP_INLINE void DEDUP_vP8_LPrefixEncodeBitsNoLUT(int distance, int* const code,
                                                  int* const extra_bits) {
  const int highest_bit = BitsLog2Floor(--distance);
  const int second_highest_bit = (distance >> (highest_bit - 1)) & 1;
  *extra_bits = highest_bit - 1;
  *code = 2 * highest_bit + second_highest_bit;
}

static WEBP_INLINE void DEDUP_vP8_LPrefixEncodeNoLUT(int distance, int* const code,
                                              int* const extra_bits,
                                              int* const extra_bits_value) {
  const int highest_bit = BitsLog2Floor(--distance);
  const int second_highest_bit = (distance >> (highest_bit - 1)) & 1;
  *extra_bits = highest_bit - 1;
  *extra_bits_value = distance & ((1 << *extra_bits) - 1);
  *code = 2 * highest_bit + second_highest_bit;
}

#define PREFIX_LOOKUP_IDX_MAX   512
typedef struct {
  int8_t code_;
  int8_t extra_bits_;
} DEDUP_vP8_LPrefixCode;

// These tables are derived using DEDUP_vP8_LPrefixEncodeNoLUT.
extern const DEDUP_vP8_LPrefixCode kPrefixEncodeCode[PREFIX_LOOKUP_IDX_MAX];
extern const uint8_t kPrefixEncodeExtraBitsValue[PREFIX_LOOKUP_IDX_MAX];
static WEBP_INLINE void DEDUP_vP8_LPrefixEncodeBits(int distance, int* const code,
                                             int* const extra_bits) {
  if (distance < PREFIX_LOOKUP_IDX_MAX) {
    const DEDUP_vP8_LPrefixCode prefix_code = kPrefixEncodeCode[distance];
    *code = prefix_code.code_;
    *extra_bits = prefix_code.extra_bits_;
  } else {
    DEDUP_vP8_LPrefixEncodeBitsNoLUT(distance, code, extra_bits);
  }
}

static WEBP_INLINE void DEDUP_vP8_LPrefixEncode(int distance, int* const code,
                                         int* const extra_bits,
                                         int* const extra_bits_value) {
  if (distance < PREFIX_LOOKUP_IDX_MAX) {
    const DEDUP_vP8_LPrefixCode prefix_code = kPrefixEncodeCode[distance];
    *code = prefix_code.code_;
    *extra_bits = prefix_code.extra_bits_;
    *extra_bits_value = kPrefixEncodeExtraBitsValue[distance];
  } else {
    DEDUP_vP8_LPrefixEncodeNoLUT(distance, code, extra_bits, extra_bits_value);
  }
}

// Sum of each component, mod 256.
static WEBP_UBSAN_IGNORE_UNSIGNED_OVERFLOW WEBP_INLINE
uint32_t DEDUP_vP8_LAddPixels(uint32_t a, uint32_t b) {
  const uint32_t alpha_and_green = (a & 0xff00ff00u) + (b & 0xff00ff00u);
  const uint32_t red_and_blue = (a & 0x00ff00ffu) + (b & 0x00ff00ffu);
  return (alpha_and_green & 0xff00ff00u) | (red_and_blue & 0x00ff00ffu);
}

// Difference of each component, mod 256.
static WEBP_UBSAN_IGNORE_UNSIGNED_OVERFLOW WEBP_INLINE
uint32_t DEDUP_vP8_LSubPixels(uint32_t a, uint32_t b) {
  const uint32_t alpha_and_green =
      0x00ff00ffu + (a & 0xff00ff00u) - (b & 0xff00ff00u);
  const uint32_t red_and_blue =
      0xff00ff00u + (a & 0x00ff00ffu) - (b & 0x00ff00ffu);
  return (alpha_and_green & 0xff00ff00u) | (red_and_blue & 0x00ff00ffu);
}

//------------------------------------------------------------------------------

#ifdef __cplusplus
}    // extern "C"
#endif

#endif  // WEBP_DSP_LOSSLESS_COMMON_H_