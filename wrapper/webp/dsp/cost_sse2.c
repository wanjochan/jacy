// Copyright 2015 Google Inc. All Rights Reserved.
//
// Use of this source code is governed by a BSD-style license
// that can be found in the COPYING file in the root of the source
// tree. An additional intellectual property rights grant can be found
// in the file PATENTS. All contributing project authors may
// be found in the AUTHORS file in the root of the source tree.
// -----------------------------------------------------------------------------
//
// SSE2 version of cost functions
//
// Author: Skal (pascal.massimino@gmail.com)

#include "./dsp.h"

#if defined(WEBP_USE_SSE2)
#include <emmintrin.h>

#include "../enc/cost.h"
#include "../enc/vp8enci.h"
#include "../utils/utils.h"

//------------------------------------------------------------------------------

static void SetResidualCoeffsSSE2(const int16_t* const coeffs,
                                  DEDUP_vP8_Residual* const res) {
  const __m128i c0 = _mm_loadu_si128((const __m128i*)(coeffs + 0));
  const __m128i c1 = _mm_loadu_si128((const __m128i*)(coeffs + 8));
  // Use SSE2 to compare 16 values with a single instruction.
  const __m128i zero = _mm_setzero_si128();
  const __m128i m0 = _mm_packs_epi16(c0, c1);
  const __m128i m1 = _mm_cmpeq_epi8(m0, zero);
  // Get the comparison results as a bitmask into 16bits. Negate the mask to get
  // the position of entries that are not equal to zero. We don't need to mask
  // out least significant bits according to res->first, since coeffs[0] is 0
  // if res->first > 0.
  const uint32_t mask = 0x0000ffffu ^ (uint32_t)_mm_movemask_epi8(m1);
  // The position of the most significant non-zero bit indicates the position of
  // the last non-zero value.
  assert(res->first == 0 || coeffs[0] == 0);
  res->last = mask ? BitsLog2Floor(mask) : -1;
  res->coeffs = coeffs;
}

static int GetResidualCostSSE2(int ctx0, const DEDUP_vP8_Residual* const res) {
  uint8_t levels[16], ctxs[16];
  uint16_t abs_levels[16];
  int n = res->first;
  // should be prob[DEDUP_vP8_EncBands[n]], but it's equivalent for n=0 or 1
  const int p0 = res->prob[n][ctx0][0];
  CostArrayPtr const costs = res->costs;
  const uint16_t* t = costs[n][ctx0];
  // bit_cost(1, p0) is already incorporated in t[] tables, but only if ctx != 0
  // (as required by the syntax). For ctx0 == 0, we need to add it here or it'll
  // be missing during the loop.
  int cost = (ctx0 == 0) ? DEDUP_vP8_BitCost(1, p0) : 0;

  if (res->last < 0) {
    return DEDUP_vP8_BitCost(0, p0);
  }

  {   // precompute clamped levels and contexts, packed to 8b.
    const __m128i zero = _mm_setzero_si128();
    const __m128i kCst2 = _mm_set1_epi8(2);
    const __m128i kCst67 = _mm_set1_epi8(MAX_VARIABLE_LEVEL);
    const __m128i c0 = _mm_loadu_si128((const __m128i*)&res->coeffs[0]);
    const __m128i c1 = _mm_loadu_si128((const __m128i*)&res->coeffs[8]);
    const __m128i D0 = _mm_sub_epi16(zero, c0);
    const __m128i D1 = _mm_sub_epi16(zero, c1);
    const __m128i E0 = _mm_max_epi16(c0, D0);   // abs(v), 16b
    const __m128i E1 = _mm_max_epi16(c1, D1);
    const __m128i F = _mm_packs_epi16(E0, E1);
    const __m128i G = _mm_min_epu8(F, kCst2);    // context = 0,1,2
    const __m128i H = _mm_min_epu8(F, kCst67);   // clamp_level in [0..67]

    _mm_storeu_si128((__m128i*)&ctxs[0], G);
    _mm_storeu_si128((__m128i*)&levels[0], H);

    _mm_storeu_si128((__m128i*)&abs_levels[0], E0);
    _mm_storeu_si128((__m128i*)&abs_levels[8], E1);
  }
  for (; n < res->last; ++n) {
    const int ctx = ctxs[n];
    const int level = levels[n];
    const int flevel = abs_levels[n];   // full level
    cost += DEDUP_vP8_LevelFixedCosts[flevel] + t[level];  // simplified DEDUP_vP8_LevelCost()
    t = costs[n + 1][ctx];
  }
  // Last coefficient is always non-zero
  {
    const int level = levels[n];
    const int flevel = abs_levels[n];
    assert(flevel != 0);
    cost += DEDUP_vP8_LevelFixedCosts[flevel] + t[level];
    if (n < 15) {
      const int b = DEDUP_vP8_EncBands[n + 1];
      const int ctx = ctxs[n];
      const int last_p0 = res->prob[b][ctx][0];
      cost += DEDUP_vP8_BitCost(0, last_p0);
    }
  }
  return cost;
}

//------------------------------------------------------------------------------
// Entry point

extern void DEDUP_vP8_EncDspCostInitSSE2(void);

WEBP_TSAN_IGNORE_FUNCTION void DEDUP_vP8_EncDspCostInitSSE2(void) {
  DEDUP_vP8_SetResidualCoeffs = SetResidualCoeffsSSE2;
  DEDUP_vP8_GetResidualCost = GetResidualCostSSE2;
}

#else  // !WEBP_USE_SSE2

WEBP_DSP_INIT_STUB(DEDUP_vP8_EncDspCostInitSSE2)

#endif  // WEBP_USE_SSE2