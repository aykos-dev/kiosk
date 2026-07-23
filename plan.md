# Bellissimo Kiosk — Hardware Integration Plan

Living document for the physical-hardware integration (card terminals + receipt
printer). Keeps track of what's done and, importantly, the **missing pieces we
are blocked on or still owe**.

## Hardware

| Device | Model | Purpose | Link to kiosk PC |
| --- | --- | --- | --- |
| Receipt printer | XPrinter | Print order receipt | USB, ESC/POS |
| Card terminal (Humo) | Sunmi P3 | Humo card payments | USB / serial ECR |
| Card terminal (Uzcard) | PAX A35 | Uzcard card payments | USB / serial ECR |

Every kiosk has **both** terminals. `port` (COM) is configurable per install in
`config.json` (`hardware.paymentTerminals.{humo,uzcard}.port`), because a device
can enumerate on a different COM number on a different PC.

## Done

- [x] Config split into `hardware.paymentTerminals.{humo,uzcard}` + `hardware.printer`, all fields overridable via `config.json` (next to exe or in `userData`). Per-terminal mock-in-production guard. Back-compat migration from the old single `paymentTerminal` key.
- [x] ECR serial protocol module (`electron/hardware/ecr/ecrProtocol.js`) — framing/LRC/encode/decode/parse, unit round-trip verified.
- [x] Serial ECR terminal driver (`electron/hardware/SerialEcrPaymentTerminal.js`) using `serialport`.
- [x] ESC/POS command builder (`electron/hardware/escpos/commands.js`) + USB printer (`ThermalReceiptPrinter.js`) using `usb`.
- [x] Terminal router + IPC (`chargeCard`, `printReceipt`, `testPayment`, `testPrinter`).
- [x] Static Humo/Uzcard buttons on the payment screen, routed to the matching terminal.
- [x] Print a receipt on **every** successful order (card, cash, QR/online).
- [x] Crash-free hardware layer: lazy native imports in try/catch, `error` listeners attached, errors surfaced to the UI (dev phase).

## MISSING / BLOCKED — needs input

### 1. Acquirer ECR spec for Humo (Sunmi P3) and Uzcard (PAX A35)  — **BLOCKED, no answer yet**

> The exact command/sub-command opcodes, field IDs, and amount encoding are
> acquirer-specific and are **not publicly documented** per device (the wire
> protocol is defined by the payment app the acquirer installs on the device).
>
> The current driver uses the publicly documented **ComGate POS-2-ECR v3.00**
> framing as a stand-in (STX·header·ETX·data·LRC; `RQ_SRV`/`C_Payment` sale;
> amount field `C`; status `S` 0/1/9; result code `R` `0000`=OK). Every
> acquirer-specific constant is centralized in `ecrProtocol.js` `DEFAULTS` and in
> per-terminal config, so **adapting to the real spec is a constants change, not
> a rewrite.**
>
> **Action:** obtain the acquirer's ECR integration PDF/SDK for each terminal and
> map: protocol name/version, sale opcode + sub-command, amount encoding
> (decimals / minor units), approve vs decline fields, txn/RRN + auth-code field
> ids, and the ACK/timeout behaviour. Then update `DEFAULTS`/`CMD`/`SUB`/`FIELD`.
>
> **Status: waiting on the spec. Until then only the mock terminal is trustworthy.**

### 2. Real device identifiers for production `config.json`

- [ ] COM port names for each terminal (Windows Device Manager) → `hardware.paymentTerminals.{humo,uzcard}.port`.
- [ ] XPrinter USB `vendorId` / `productId` → `hardware.printer`.
- [ ] Confirm printer `charsPerLine` for the actual paper width (58mm≈32, 80mm≈48).

## Open questions / future

- [ ] Admin-panel per-terminal + printer test buttons (there is `testPayment(kind)` / `testPrinter()` IPC already).
- [ ] For QR/online, there is currently no payment-confirmation callback — the receipt prints at successful **order placement**, not at confirmed settlement. Revisit if/when a settlement webhook exists.
- [ ] Receipt localization / branding (logo bitmap, address line, fiscal data if required).
- [ ] Reconciliation flow for "card charged but backend order failed" (today: prints a proof receipt + shows "call staff").
