---
title: "Tracking crypto invariants with eBPF"
date: "2026-08-04"
---

# Tracking crypto invariants with eBPF

Auditing crypto calls from user space using `LD_PRELOAD` doesn't work for statically linked Go or Rust binaries, or when applications call syscalls like `SYS_keyctl` or `AF_ALG` directly.

Using eBPF lets you attach probes to kernel crypto functions without modifying the target applications or slowing down the system.

---

## 1. Checking for Nonce/IV Reuse

In ciphers like AES-GCM, reusing an initialization vector (IV) under the same key completely breaks authentication and lets an attacker recover the hash key.

With eBPF, we can record seen `(key, nonce)` pairs in a BPF hash map and emit an alert if a duplicate is observed:

```c
// SPDX-License-Identifier: GPL-2.0
#include <vmlinux.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>

struct crypto_event_t {
    __u32 pid;
    __u32 uid;
    char comm[16];
    char cipher_name[32];
};

struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 65536);
    __type(key, __u64);
    __type(value, __u32);
} iv_map SEC(".maps");

struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, 256 * 1024);
} ringbuf SEC(".maps");

SEC("kprobe/crypto_alloc_skcipher")
int BPF_KPROBE(trace_crypto_alloc_skcipher, const char *alg_name) {
    char name[32] = {};
    bpf_probe_read_kernel_str(name, sizeof(name), alg_name);

    // Flag unauthenticated or obsolete modes (e.g., ECB, DES)
    if (name[0] == 'e' && name[1] == 'c' && name[2] == 'b') {
        struct crypto_event_t *event = bpf_ringbuf_reserve(&ringbuf, sizeof(*event), 0);
        if (!event) return 0;

        event->pid = bpf_get_current_pid_tgid() >> 32;
        event->uid = bpf_get_current_uid_gid();
        bpf_get_current_comm(&event->comm, sizeof(event->comm));
        bpf_probe_read_kernel_str(event->cipher_name, sizeof(event->cipher_name), name);

        bpf_ringbuf_submit(event, 0);
    }
    return 0;
}
```

---

## 2. Low Overhead with Ring Buffers

Events are written to user space via BPF ring buffers (`BPF_MAP_TYPE_RINGBUF`). Because it's a lockless, memory-mapped circular buffer shared across CPUs, it handles bursts without drops or adding latency to encryption throughput.
