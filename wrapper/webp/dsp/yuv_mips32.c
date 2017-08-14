// Copyright 2014 Google Inc. All Rights Reserved.
//
// Use of this source code is governed by a BSD-style license
// that can be found in the COPYING file in the root of the source
// tree. An additional intellectual property rights grant can be found
// in the file PATENTS. All contributing project authors may
// be found in the AUTHORS file in the root of the source tree.
// -----------------------------------------------------------------------------
//
// MIPS version of YUV to RGB upsampling functions.
//
// Author(s):  Djordje Pesut    (djordje.pesut@imgtec.com)
//             Jovan Zelincevic (jovan.zelincevic@imgtec.com)

#include "./dsp.h"

#if defined(WEBP_USE_MIPS32)

#include "./yuv.h"

//------------------------------------------------------------------------------
// simple point-sampling

#define ROW_FUNC(FUNC_NAME, XSTEP, R, G, B, A)                                 \
static void FUNC_NAME(const uint8_t* y,                                        \
                      const uint8_t* u, const uint8_t* v,                      \
                      uint8_t* dst, int len) {                                 \
  int i, r, g, b;                                                              \
  int temp0, temp1, temp2, temp3, temp4;                                       \
  for (i = 0; i < (len >> 1); i++) {                                           \
    temp1 = MultHi(v[0], 26149);                                               \
    temp3 = MultHi(v[0], 13320);                                               \
    temp2 = MultHi(u[0], 6419);                                                \
    temp4 = MultHi(u[0], 33050);                                               \
    temp0 = MultHi(y[0], 19077);                                               \
    temp1 -= 14234;                                                            \
    temp3 -= 8708;                                                             \
    temp2 += temp3;                                                            \
    temp4 -= 17685;                                                            \
    r = DEDUP_vP8_Clip8(temp0 + temp1);                                               \
    g = DEDUP_vP8_Clip8(temp0 - temp2);                                               \
    b = DEDUP_vP8_Clip8(temp0 + temp4);                                               \
    temp0 = MultHi(y[1], 19077);                                               \
    dst[R] = r;                                                                \
    dst[G] = g;                                                                \
    dst[B] = b;                                                                \
    if (A) dst[A] = 0xff;                                                      \
    r = DEDUP_vP8_Clip8(temp0 + temp1);                                               \
    g = DEDUP_vP8_Clip8(temp0 - temp2);                                               \
    b = DEDUP_vP8_Clip8(temp0 + temp4);                                               \
    dst[R + XSTEP] = r;                                                        \
    dst[G + XSTEP] = g;                                                        \
    dst[B + XSTEP] = b;                                                        \
    if (A) dst[A + XSTEP] = 0xff;                                              \
    y += 2;                                                                    \
    ++u;                                                                       \
    ++v;                                                                       \
    dst += 2 * XSTEP;                                                          \
  }                                                                            \
  if (len & 1) {                                                               \
    temp1 = MultHi(v[0], 26149);                                               \
    temp3 = MultHi(v[0], 13320);                                               \
    temp2 = MultHi(u[0], 6419);                                                \
    temp4 = MultHi(u[0], 33050);                                               \
    temp0 = MultHi(y[0], 19077);                                               \
    temp1 -= 14234;                                                            \
    temp3 -= 8708;                                                             \
    temp2 += temp3;                                                            \
    temp4 -= 17685;                                                            \
    r = DEDUP_vP8_Clip8(temp0 + temp1);                                               \
    g = DEDUP_vP8_Clip8(temp0 - temp2);                                               \
    b = DEDUP_vP8_Clip8(temp0 + temp4);                                               \
    dst[R] = r;                                                                \
    dst[G] = g;                                                                \
    dst[B] = b;                                                                \
    if (A) dst[A] = 0xff;                                                      \
  }                                                                            \
}

ROW_FUNC(YuvToRgbRow,      3, 0, 1, 2, 0)
ROW_FUNC(YuvToRgbaRow,     4, 0, 1, 2, 3)
ROW_FUNC(YuvToBgrRow,      3, 2, 1, 0, 0)
ROW_FUNC(YuvToBgraRow,     4, 2, 1, 0, 3)

#undef ROW_FUNC

//------------------------------------------------------------------------------
// Entry point

extern void DEDUP_WEBP_InitSamplersMIPS32(void);

WEBP_TSAN_IGNORE_FUNCTION void DEDUP_WEBP_InitSamplersMIPS32(void) {
  DEDUP_WEBP_Samplers[MODE_RGB]  = YuvToRgbRow;
  DEDUP_WEBP_Samplers[MODE_RGBA] = YuvToRgbaRow;
  DEDUP_WEBP_Samplers[MODE_BGR]  = YuvToBgrRow;
  DEDUP_WEBP_Samplers[MODE_BGRA] = YuvToBgraRow;
}

#else  // !WEBP_USE_MIPS32

WEBP_DSP_INIT_STUB(DEDUP_WEBP_InitSamplersMIPS32)

#endif  // WEBP_USE_MIPS32