# Examples

Two self-contained, invented system maps you can render end-to-end. Each is an
**archify architecture IR** (`*.architecture.json`) — the typed intermediate that
`sysmap-to-miro` consumes — paired with the **board plan** the converter emits
(`*.board-plan.json`), so you can see the input and the output side by side.

Nothing here refers to any real system; they exist to exercise the two things the
skill depends on:

1. **Service-accurate icons.** archify component `type`s are coarse (every store is
   `database`), so the converter infers the real AWS service from each node's
   `label`/`sublabel` and only falls back to the type when nothing matches. These
   examples deliberately include lookups that are easy to get wrong — `Kinesis
   Firehose` vs `Kinesis`, `SQS`/`SES` that must *not* collide with `S3`, `Fargate`,
   `SNS`, `EventBridge`.
2. **Boundaries → titled white zones** on the Miro board.

## The IR in one minute

```jsonc
{
  "schema_version": 1,
  "diagram_type": "architecture",
  "meta": { "title": "...", "subtitle": "...", "viewBox": [w, h] },
  "components": [
    // one box. type is coarse; label+sublabel drive the icon.
    { "id": "api", "type": "cloud", "label": "Public API", "sublabel": "API Gateway",
      "pos": [x, y], "size": [w, h], "tag": "optional badge text" }
  ],
  "boundaries": [
    // a group; becomes a titled white frame wrapping its members.
    { "kind": "region", "label": "Edge / API", "wraps": ["api", "..."] }
  ],
  "connections": [
    // an edge. variant "emphasis" = main path (solid/green),
    // "dashed" = async/control (dashed/grey).
    { "from": "client", "to": "api", "label": "POST /links", "variant": "emphasis" }
  ]
}
```

Component `type` (one of `external · frontend · backend · database · cloud ·
messagebus · security`) is only the **fallback** icon. The real icon comes from the
words in `label`/`sublabel` — so write `sublabel: "DynamoDB"`, not just
`type: "database"`, and you get the DynamoDB icon instead of the generic one.

## 1. `url-shortener.architecture.json`

A serverless link shortener. Demonstrates a **split request path** (one API, two
Lambdas — create vs. redirect), a **read-through cache**, and a **click-analytics
pipeline** (SQS → Lambda → Firehose → S3). Three boundaries: *Edge / API*,
*Storage*, *Click analytics*.

Icon lookups worth noting: `Kinesis Firehose` → Firehose (not Kinesis Streams);
`SQS queue` → SQS (not S3); `SES email` → SES; `DynamoDB DAX` → DynamoDB.

## 2. `ecommerce-checkout.architecture.json`

An event-driven checkout: synchronous **order placement** (API Gateway → Fargate
service → DynamoDB + Stripe) then **asynchronous fulfilment** (SQS FIFO → Lambda →
EventBridge → SNS fan-out to a partner warehouse) and **notifications** (Lambda →
SES). Two boundaries: *Checkout*, *Fulfilment*. External systems (Stripe, the
partner WMS) have no AWS icon and fall back to the neutral `users` glyph — which is
the intended behaviour for third parties.

## 3. `ecommerce-checkout-gcp.architecture.json`

The same checkout flow as #2, retargeted to Google Cloud — Cloud Run, Firestore,
Pub/Sub, Cloud Functions, Cloud Storage — to show the identical IR shape rendering
in a different provider's icon set. Third parties (Stripe, SendGrid, the partner
WMS) fall back to the neutral glyph. Render with `--iconset gcp`.

## Run one

```bash
# Board plan with AWS icons (what the skill materializes on Miro):
node ../bin/ir-to-miro.mjs url-shortener.architecture.json --iconset aws

# Native Miro shapes instead of provider icons (fully editable, no images):
node ../bin/ir-to-miro.mjs url-shortener.architecture.json --iconset none
```

Then follow the skill's **Workflow** (SKILL.md) to lay it onto a Miro board:
frames first, icons on top, labels, connectors last. Swap `--iconset` for `gcp`,
`azure`, or `custom` if you've filled in those icon paths in `icons/map.json`.

## Make your own

Copy either file, change the `components` / `connections` / `boundaries`, keep
`sublabel`s specific enough to name the service, and re-run the converter. Or let
[archify](https://github.com/tt-a1i/archify) generate the IR from a description and
point the converter at that.
