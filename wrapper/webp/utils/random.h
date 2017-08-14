// Copyright 2013 Google Inc. All Rights Reserved.
//
// Use of this source code is governed by a BSD-style license
// that can be found in the COPYING file in the root of the source
// tree. An additional intellectual property rights grant can be found
// in the file PATENTS. All contributing project authors may
// be found in the AUTHORS file in the root of the source tree.
// -----------------------------------------------------------------------------
//
// Pseudo-random utilities
//
// Author: Skal (pascal.massimino@gmail.com)

#ifndef WEBP_UTILS_RANDOM_H_
#define WEBP_UTILS_RANDOM_H_

#include <assert.h>
#include "../webp/types.h"

#ifdef __cplusplus
extern "C" {
#endif

#define DEDUP_vP8__RANDOM_DITHER_FIX 8   // fixed-point precision for dithering
#define DEDUP_vP8__RANDOM_TABLE_SIZE 55

typedef struct {
  int index1_, index2_;
  uint32_t tab_[DEDUP_vP8__RANDOM_TABLE_SIZE];
  int amp_;
} DEDUP_vP8_Random;

// Initializes random generator with an amplitude 'dithering' in range [0..1].
void DEDUP_vP8_InitRandom(DEDUP_vP8_Random* const rg, float dithering);

// Returns a centered pseudo-random number with 'num_bits' amplitude.
// (uses D.Knuth's Difference-based random generator).
// 'amp' is in DEDUP_vP8__RANDOM_DITHER_FIX fixed-point precision.
static WEBP_INLINE int DEDUP_vP8_RandomBits2(DEDUP_vP8_Random* const rg, int num_bits,
                                      int amp) {
  int diff;
  assert(num_bits + DEDUP_vP8__RANDOM_DITHER_FIX <= 31);
  diff = rg->tab_[rg->index1_] - rg->tab_[rg->index2_];
  if (diff < 0) diff += (1u << 31);
  rg->tab_[rg->index1_] = diff;
  if (++rg->index1_ == DEDUP_vP8__RANDOM_TABLE_SIZE) rg->index1_ = 0;
  if (++rg->index2_ == DEDUP_vP8__RANDOM_TABLE_SIZE) rg->index2_ = 0;
  // sign-extend, 0-center
  diff = (int)((uint32_t)diff << 1) >> (32 - num_bits);
  diff = (diff * amp) >> DEDUP_vP8__RANDOM_DITHER_FIX;  // restrict range
  diff += 1 << (num_bits - 1);                   // shift back to 0.5-center
  return diff;
}

static WEBP_INLINE int DEDUP_vP8_RandomBits(DEDUP_vP8_Random* const rg, int num_bits) {
  return DEDUP_vP8_RandomBits2(rg, num_bits, rg->amp_);
}

#ifdef __cplusplus
}    // extern "C"
#endif

#endif  /* WEBP_UTILS_RANDOM_H_ */