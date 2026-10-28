# Day 8 Assignment: TicketHub Event Ticketing System

## 1. Context and Overview

TicketHub is an online event ticketing platform where users can browse concerts and other events, view available seats, reserve seats, pay for tickets and view their purchases.

The system has two very different traffic patterns.

On a normal day, users browse events and purchase tickets at a relatively manageable rate. When a popular concert goes on sale, hundreds of thousands of people may arrive almost simultaneously and compete for a limited number of seats.

The system must therefore handle sudden traffic spikes while keeping seat availability accurate, processing payments reliably and providing a fair purchasing experience.

The most important correctness requirement is that the same seat must never be sold to two different customers.

## 2. Goals and Non-Goals

### Goals

- Allow users to browse events and view event details.
- Display the seats available for a particular event.
- Allow users to hold available seats temporarily.
- Allow users to complete payment for a valid reservation.
- Allow users to view their purchased tickets.
- Prevent two customers from purchasing the same seat.
- Handle high traffic during popular ticket releases.
- Protect user information and payment operations.
- Recover from individual server or infrastructure failures.
- Provide clear responses when seats are unavailable or a payment fails.

### Non-Goals

The initial design does not attempt to build a complete event-management platform, support ticket resale, implement dynamic pricing or operate its own banking infrastructure.

Payments will be processed through an external payment provider. TicketHub remains responsible for maintaining order and seat status and reconciling payment results.

## 3. Requirements

### 3.1 Functional Requirements

1. Users can register, sign in and authenticate securely.
2. Users can browse available events.
3. Users can view event information, including the venue, time and available seats.
4. Users can temporarily hold one or more available seats.
5. A seat hold expires after a defined period if checkout is not completed.
6. Users can pay for a valid order through a payment provider.
7. Successful payment results in a confirmed order and sold seats.
8. Users can view their purchased tickets.
9. Users receive clear messages when seats are unavailable, reservations expire or payments fail.
10. The system supports cancellation or release of expired or abandoned reservations.

### 3.2 Non-Functional Requirements

**Performance:** Event details and browsing pages should load quickly under normal traffic. As a proposed target, common event-reading requests should achieve a response time below 300 milliseconds at the 95th percentile, excluding third-party payment delays.

**Correctness:** A seat can belong to at most one active reservation or completed sale. Two concurrent requests must not successfully reserve the same seat.

**Availability:** The system should target 99.9% availability and recover from individual application-server failures.

**Scalability:** The service must handle the expected demand of a major sale without allowing unlimited requests to overwhelm the database.

**Fairness:** Users should be admitted to major sales according to a clearly defined queue or waiting-room policy rather than gaining an advantage merely by repeatedly refreshing the page.

**Security:** The system must authenticate users, authorize access to their orders, validate inputs, use HTTPS and avoid storing raw payment-card details.

**Reliability:** Orders, seat holds and payment results must be handled consistently, with retries and recovery mechanisms for failed operations.

**Durability:** Confirmed orders and ticket records must survive application-server failures and normal infrastructure restarts.

## 4. Scale Estimates

### 4.1 Given Facts

- Registered users: 2,000,000.
- Normal daily visitors: 50,000.
- Pages viewed by each normal daily visitor: 10.
- Tickets sold on a normal day: 5,000.
- People trying to purchase during a major sale: 200,000.
- Seats available for the major sale: 20,000.
- Duration of the initial major-sale period: 10 minutes.

### 4.2 Assumptions

- A normal day contains 86,400 seconds.
- For a simple baseline, one page view generates one page-reading request.
- Actual page views can generate several API requests, so production measurements may show higher request rates.
- Traffic during the major sale is averaged across the first ten minutes, even though real traffic may arrive in much sharper bursts.
- Each of the 200,000 prospective buyers makes at least one purchase attempt during that period.
- A successful ticket sale requires durable reservation, order and payment-related updates.
- Peak traffic is not assumed to be evenly distributed; capacity planning must include bursts above the calculated average.

### 4.3 Normal Daily Page Requests

Normal daily visitors = 50,000.

Each visitor views 10 pages.

Daily page requests:

50,000 × 10 = 500,000 page requests per day.

Average page requests per second:

500,000 ÷ 86,400 ≈ 5.79.

**Normal average read rate ≈ 5.8 requests per second.**

For additional planning, if we assume a five-times normal peak:

5.79 × 5 ≈ 28.95.

**Illustrative normal peak ≈ 29 requests per second.**

The five-times factor is an additional planning assumption rather than a supplied fact.

### 4.4 Normal Ticket Sales

Normal daily sales = 5,000 tickets.

Average sold tickets per second:

5,000 ÷ 86,400 ≈ 0.058.

**Average sales rate ≈ 0.058 tickets per second.**

This figure represents completed ticket sales, not the total number of database operations. Each completed purchase may involve seat reservation, order creation, payment confirmation and other writes.

### 4.5 Major Sale: Incoming Purchase Attempts

A popular event attracts 200,000 prospective buyers over 10 minutes.

10 minutes = 600 seconds.

Average incoming purchase attempts:

200,000 ÷ 600 ≈ 333.33.

**Major-sale purchase attempts ≈ 333 per second on average during the ten-minute period.**

This is the estimated rate of people attempting to purchase, not a complete estimate of all API requests. Each buyer may make several requests to browse events, retrieve seat availability, hold seats and pay.

Actual API traffic may therefore be considerably higher.

### 4.6 Major Sale: Seat Supply and Demand

Available seats = 20,000.

Prospective buyers = 200,000.

Demand-to-supply ratio:

200,000 ÷ 20,000 = 10.

**There are approximately 10 prospective buyers for every available seat.**

Even if the entire inventory sells during the ten minutes, the average rate of successful seat sales would be:

20,000 ÷ 600 ≈ 33.33.

**Maximum average seat-sale rate over that period ≈ 33 seats per second.**

This does not mean that every buyer can purchase a ticket. The system must tell unsuccessful users that their selected seats are unavailable and prevent overselling.

### 4.7 Comparing Normal Traffic with Major-Sale Traffic

| Metric | Normal Day | Major Sale |
|---|---:|---:|
| Registered users | 2,000,000 | 2,000,000 |
| Visitors or prospective buyers | 50,000 per day | 200,000 in 10 minutes |
| Page or purchase activity | 500,000 page requests per day | At least 200,000 purchase attempts |
| Average estimated rate | 5.8 page requests/second | 333 purchase attempts/second |
| Available ticket inventory | Normal daily sales of 5,000 tickets | 20,000 seats |
| Main engineering concern | Consistent normal browsing and sales | Bursts, contention, fairness and overselling |

The major-sale purchase-attempt rate is approximately 57 times the normal average page-request rate.

These two rates represent different activities, so the ratio is only a rough comparison of the intensity of incoming demand. It is not a claim that the complete API traffic will be exactly 57 times higher.

### 4.8 What the Estimates Tell Us

The system must not rely on a single application server or allow every incoming request to perform unrestricted work against the primary database.

A waiting room can regulate admission to a major sale. Multiple application servers can process requests concurrently. Caching can speed up public event details, while a strongly consistent reservation operation protects seat inventory.

However, cached seat availability must never be treated as final proof that a seat is still available. The database must make the final reservation decision.

## 5. API Design

The API uses resource-oriented URLs and standard HTTP methods. Requests and responses use JSON where appropriate.

Base URL:

    https://api.tickethub.example.com/api/v1

This is an illustrative URL for the proposed design, not a deployed production endpoint.

### Endpoint 1: Browse Events

**Method:** GET

**Path:** `/events?page=1&limit=20`

**Purpose:** Returns a paginated list of events available for browsing.

**Success status:** `200 OK`

Example response:

    {
      "data": [
        {
          "id": 101,
          "name": "Summer Music Festival",
          "venue": "Main Arena",
          "startsAt": "2027-06-20T18:00:00Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20
      }
    }

### Endpoint 2: View Event Details

**Method:** GET

**Path:** `/events/{eventId}`

**Purpose:** Returns the information for one event, including its venue, schedule and ticket-sale information.

**Success status:** `200 OK`

A nonexistent event returns `404 Not Found`.

### Endpoint 3: View Seats

**Method:** GET

**Path:** `/events/{eventId}/seats`

**Purpose:** Displays seat labels, prices and an availability snapshot for the selected event.

**Success status:** `200 OK`

Example response:

    {
      "eventId": 101,
      "seats": [
        {
          "id": 5001,
          "label": "A-01",
          "priceCents": 7500,
          "status": "available"
        },
        {
          "id": 5002,
          "label": "A-02",
          "priceCents": 7500,
          "status": "held"
        }
      ]
    }

Availability information may be cached briefly for browsing. It is only a snapshot; the actual hold request must validate availability against authoritative seat state.

### Endpoint 4: Hold Seats

**Method:** POST

**Path:** `/events/{eventId}/holds`

**Purpose:** Attempts to reserve selected available seats temporarily while a user checks out.

**Success status:** `201 Created`

Example request body:

    {
      "seatIds": [5001, 5002],
      "idempotencyKey": "purchase-session-abc123"
    }

Example successful response:

    {
      "holdId": 9001,
      "eventId": 101,
      "seatIds": [5001, 5002],
      "status": "held",
      "expiresAt": "2026-10-28T19:15:00Z"
    }

If any requested seat is unavailable, the system must not silently create a partial reservation. It should roll back the operation and return `409 Conflict`.

Authentication and authorization are required. The backend must not trust the browser to decide whether a seat is available.

### Endpoint 5: Pay for an Order

**Method:** POST

**Path:** `/orders/{orderId}/payment`

**Purpose:** Initiates or confirms payment for a valid order whose seat hold remains valid.

**Success status:** `200 OK` when the payment is confirmed synchronously, or `202 Accepted` when the payment result is still being processed asynchronously.

Example request body:

    {
      "paymentMethodToken": "payment-provider-token",
      "idempotencyKey": "payment-attempt-abc123"
    }

The token represents a payment-provider reference. Raw card information should be handled by a compliant payment provider rather than stored by TicketHub.

Example confirmed response:

    {
      "orderId": 7001,
      "status": "paid",
      "amountCents": 15000,
      "currency": "USD"
    }

The server must prevent duplicate payment processing and must not confirm a purchase for a seat that is no longer reserved for that order.

### Endpoint 6: View My Tickets

**Method:** GET

**Path:** `/users/me/tickets`

**Purpose:** Returns tickets belonging to the authenticated user.

**Success status:** `200 OK`

Example response:

    {
      "data": [
        {
          "ticketId": 8001,
          "eventId": 101,
          "eventName": "Summer Music Festival",
          "seatLabel": "A-01",
          "orderId": 7001,
          "status": "confirmed"
        }
      ]
    }

The server derives the current user from authentication credentials and returns only that user's tickets.

### Endpoint 7: Release a Hold

**Method:** DELETE

**Path:** `/holds/{holdId}`

**Purpose:** Releases a user's temporary reservation when the user cancels checkout.

**Success status:** `204 No Content`

The operation must verify that the hold belongs to the requesting user and that it is still eligible for release. Associated seats can then return to the available state.

### Common API Error Responses

- `400 Bad Request`: The request body is malformed.
- `401 Unauthorized`: Authentication is missing or invalid.
- `403 Forbidden`: The authenticated user is not permitted to perform the operation.
- `404 Not Found`: The requested event, order, seat or hold does not exist or is not accessible.
- `409 Conflict`: A seat is already held or sold.
- `422 Unprocessable Content`: The request is syntactically valid but fails a business rule.
- `429 Too Many Requests`: A client has exceeded its permitted request rate.
- `500 Internal Server Error`: An unexpected server-side error occurred.

Example conflict response:

    {
      "error": {
        "code": "SEAT_UNAVAILABLE",
        "message": "One or more selected seats are no longer available."
      }
    }

The client must handle these responses without implying that an unsuccessful reservation or payment has succeeded.

## 6. Data Model

The core entities are users, events, seats and orders. These tables represent customers, events for sale, individual seats within those events and purchase transactions.

An additional `order_items` table connects orders to the seats included in each order.

### 6.1 Users

The `users` table stores the identity of each registered customer.

- `id`: unique user identifier and primary key.
- `name`: customer's display name.
- `email`: customer's email address, which must be unique.

### 6.2 Events

The `events` table stores the events being sold.

- `id`: unique event identifier and primary key.
- `name`: event name.
- `venue`: event location.
- `starts_at`: scheduled event start time.
- `sales_open_at`: time ticket sales begin.

### 6.3 Seats

The `seats` table records the physical or assigned seats belonging to an event.

- `id`: unique seat identifier and primary key.
- `event_id`: foreign key to `events.id`.
- `seat_label`: human-readable seat identifier.
- `price_cents`: ticket price stored in the smallest currency unit.
- `status`: available, held or sold.
- `current_order_id`: the order currently holding or owning the seat, when applicable.
- `hold_expires_at`: expiration time for a temporary hold.

The pair `event_id` and `seat_label` must be unique so one event cannot contain two records for the same seat.

### 6.4 Orders

The `orders` table tracks an attempted or completed purchase.

- `id`: unique order identifier and primary key.
- `user_id`: foreign key to `users.id`.
- `event_id`: foreign key to `events.id`.
- `status`: pending, paid, expired or cancelled.
- `idempotency_key`: a unique key used to recognize repeated requests safely.
- `created_at`: order creation time.
- `expires_at`: expiration time for a pending order or hold.

An order may contain one or more seats. Only a paid order represents a completed purchase.

### 6.5 Order Items

The `order_items` table records the seats associated with each order.

- `id`: unique order-item identifier and primary key.
- `order_id`: foreign key to `orders.id`.
- `seat_id`: foreign key to `seats.id`.
- `price_cents`: the agreed seat price recorded for the order.

The combination of `order_id` and `seat_id` must be unique to prevent the same seat from being listed twice within one order.

### 6.6 Relationships

- **Users to Orders:** One-to-many. A user can make many orders, but each order belongs to one user.
- **Events to Seats:** One-to-many. An event contains many seats, and each seat belongs to one event.
- **Events to Orders:** One-to-many. An event can have many orders.
- **Orders to Seats:** An order can contain multiple seats, and a seat can appear in different historical orders over time if earlier orders expire or are cancelled. The seat's current status determines whether it is available for a new order.
- **Orders to Order Items:** One-to-many. An order can contain multiple order-item records.
- **Seats to Order Items:** One-to-many over the seat's history. Each order item represents a seat's association with a particular order.

The `seats` table stores the authoritative current state of the seat. Historical order-item records do not by themselves mean that a seat is still held or sold.

### 6.7 SQL Schema

The following statements use SQLite-compatible SQL. Foreign-key enforcement must be enabled on the database connection.

    PRAGMA foreign_keys = ON;

    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE
    );

    CREATE TABLE events (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      venue TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      sales_open_at TEXT NOT NULL
    );

    CREATE TABLE orders (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      event_id INTEGER NOT NULL,
      status TEXT NOT NULL
        CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
      idempotency_key TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT,
      UNIQUE (user_id, idempotency_key),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE TABLE seats (
      id INTEGER PRIMARY KEY,
      event_id INTEGER NOT NULL,
      seat_label TEXT NOT NULL,
      price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
      status TEXT NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'held', 'sold')),
      current_order_id INTEGER,
      hold_expires_at TEXT,
      UNIQUE (event_id, seat_label),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (current_order_id) REFERENCES orders(id),
      CHECK (
        (status = 'available' AND current_order_id IS NULL)
        OR
        (status IN ('held', 'sold') AND current_order_id IS NOT NULL)
      )
    );

    CREATE TABLE order_items (
      id INTEGER PRIMARY KEY,
      order_id INTEGER NOT NULL,
      seat_id INTEGER NOT NULL,
      price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
      UNIQUE (order_id, seat_id),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (seat_id) REFERENCES seats(id)
    );

### 6.8 Indexes

    CREATE INDEX idx_seats_event_status
    ON seats(event_id, status);

    CREATE INDEX idx_orders_user_created
    ON orders(user_id, created_at DESC);

    CREATE INDEX idx_order_items_order
    ON order_items(order_id);

The seat index helps retrieve the seats for an event and filter by their current status. The order index helps retrieve a user's order history, and the order-item index helps retrieve the seats belonging to an order.

Unique constraints also create supporting indexes in SQLite. Indexes improve suitable reads, but they use storage and introduce additional work during writes.

### 6.9 Example Queries

Retrieve an event's currently available seats:

    SELECT id, seat_label, price_cents
    FROM seats
    WHERE event_id = 101
      AND status = 'available'
    ORDER BY seat_label;

Retrieve a user's paid orders:

    SELECT orders.id, events.name, orders.created_at
    FROM orders
    JOIN events
      ON events.id = orders.event_id
    WHERE orders.user_id = 1
      AND orders.status = 'paid'
    ORDER BY orders.created_at DESC;

Retrieve seats included in a particular order:

    SELECT seats.seat_label, order_items.price_cents
    FROM order_items
    JOIN seats
      ON seats.id = order_items.seat_id
    WHERE order_items.order_id = 7001;

The JOIN queries combine related tables instead of duplicating event or seat information inside the orders table.

## 7. Preventing Double-Booking

Preventing double-booking is the most important correctness problem in TicketHub.

Imagine two customers, Amina and Brian, both selecting seat A-01 at almost exactly the same time.

A design that checks availability only in the browser is unsafe. Both browsers could see the seat as available and send requests before either receives the other's result.

TicketHub must make the reservation decision using authoritative database state.

### 7.1 Temporary Seat Holds

When a user selects seats, the server attempts to change their status from `available` to `held` and assigns them to a pending order.

A hold expires after a short, defined period, such as ten minutes. If checkout is abandoned, the system releases the seats so another customer can purchase them.

The expiration time is checked by the server, not trusted from the browser.

### 7.2 Atomic Database Update

The system starts a database transaction and creates a pending order. It then conditionally updates all requested seats.

Conceptually, the update is:

    UPDATE seats
    SET status = 'held',
        current_order_id = :order_id,
        hold_expires_at = :hold_expiry
    WHERE id IN (:requested_seat_ids)
      AND (
        status = 'available'
        OR (
          status = 'held'
          AND hold_expires_at <= :current_time
        )
      );

The application checks the number of affected rows.

If every requested seat was successfully updated, the transaction can continue and commit the reservation. If even one seat could not be reserved, the entire transaction is rolled back and the customer receives a conflict response.

The actual implementation must bind the requested seat IDs safely, verify they belong to the intended event and ensure all required updates occur within one transaction.

### 7.3 Why the Transaction Matters

A database transaction groups related changes so they succeed or fail together.

If Amina and Brian request the same seat concurrently, only one transaction can successfully change that seat from available to held. The competing transaction must observe that the seat is no longer available and fail rather than assigning it to a second order.

A production database can use row-level locking or equivalent atomic conditional updates to enforce this behavior. The exact implementation depends on the database technology, but the availability check and state change must be atomic.

### 7.4 Constraints Provide Additional Protection

The UNIQUE constraint on `(event_id, seat_label)` prevents duplicate records for the same seat within an event.

The current seat status and `current_order_id` identify which order owns a held or sold seat.

These controls help protect data integrity, but the unique seat label constraint alone does not prevent two orders from racing to reserve the same existing seat. The atomic reservation transaction is essential.

### 7.5 Payment and Confirmation

A successful seat hold does not by itself mean a ticket has been sold.

The system temporarily reserves the seat, initiates payment and waits for a trusted payment result. After payment is confirmed, a short database transaction verifies that the hold still belongs to the order and is valid, marks the order as paid and changes the seats to sold.

If payment fails, the order is cancelled or allowed to expire, and the held seats are released according to the payment and reservation rules.

If a payment succeeds after a hold has expired, the system must not silently sell the seat again or issue a duplicate ticket. It should reconcile the payment and apply a defined compensation policy, such as refunding the payment.

### 7.6 Idempotency

Clients may retry requests when a network response is lost. Without protection, a retry could create duplicate orders or charge a customer twice.

An idempotency key lets the backend recognize repeated attempts for the same operation and return the original result rather than processing the same logical operation again.

Payment callbacks and background tasks must also be handled safely when the same message arrives more than once.

## 8. Architecture Diagram

    +---------------------------------------------------+
    |                   CLIENT DEVICES                  |
    |              Browsers and mobile apps            |
    +---------------------------------------------------+
                            |
                            v
    +---------------------------------------------------+
    |                        DNS                        |
    |             Resolves TicketHub domains            |
    +---------------------------------------------------+
                            |
                            v
    +---------------------------------------------------+
    |                        CDN                        |
    |             Caches public static assets           |
    +---------------------------------------------------+
                            |
                            v
    +---------------------------------------------------+
    |              WAITING ROOM / RATE LIMITER           |
    | Controls admission during high-demand sales       |
    +---------------------------------------------------+
                            |
                            v
    +---------------------------------------------------+
    |                   LOAD BALANCER                   |
    | Routes traffic to healthy application servers     |
    +---------------------------------------------------+
                |                         |
                v                         v
    +-----------------------+  +-----------------------+
    | APPLICATION SERVER A  |  | APPLICATION SERVER B  |
    | Authentication, API  |  | Authentication, API  |
    | and business rules    |  | and business rules    |
    +-----------------------+  +-----------------------+
                |                         |
                +------------+------------+
                             |
              +--------------+----------------+
              |                               |
              v                               v
    +------------------------+     +----------------------+
    | CACHE                  |     | PRIMARY DATABASE     |
    | Event details,         |     | Authoritative orders |
    | public seat snapshots  |     | and seat state       |
    +------------------------+     +----------------------+
                                             |
                                             | Replication
                                             v
                                    +----------------------+
                                    | READ REPLICA         |
                                    | Browsing and         |
                                    | reporting queries    |
                                    +----------------------+

    BACKGROUND AND PAYMENT PROCESSING

    APPLICATION SERVER
             |
             v
    +------------------------+
    | DURABLE JOB QUEUE      |
    +------------------------+
             |
             v
    +------------------------+
    | WORKER INSTANCES       |
    | Notifications, expiry  |
    | and reconciliation     |
    +------------------------+

    APPLICATION SERVER <------> EXTERNAL PAYMENT PROVIDER

The diagram is a logical design. In production, servers and managed services should be distributed across redundant infrastructure and availability zones.

## 9. Architecture Components

### 1. Client Devices

The client displays events and seats, collects user input and sends authenticated requests to the API.

### 2. DNS

DNS resolves the TicketHub domain so clients can reach the correct CDN or API endpoint.

### 3. CDN

The CDN serves cached public static files, reducing page-loading latency and unnecessary requests to the application origin. It must not expose private ticket or order data through public caching.

### 4. Waiting Room and Rate Limiter

A waiting room controls admission during major sales, while rate limits prevent individual clients from overwhelming the service. A defined admission policy improves fairness and protects downstream systems.

### 5. Load Balancer

The load balancer distributes requests among healthy application servers and removes unhealthy instances from rotation.

### 6. Application Servers

Application servers authenticate users, authorize actions, validate input, coordinate reservations and payments and apply business rules.

Multiple application-server instances reduce dependence on a single machine.

### 7. Cache

The cache stores suitable, frequently read information such as public event details and short-lived availability snapshots. It reduces repeated reads from the primary data store.

The cache is never the final authority for confirming a seat reservation.

### 8. Primary Database

The primary database stores authoritative orders, seat states and completed sales. Transactions and conditional updates prevent conflicting reservations from both succeeding.

### 9. Read Replica

A read replica serves suitable browsing and reporting queries, reducing the load on the primary database. A replica may lag behind the primary, so seat-hold and purchase decisions must use the authoritative write path.

### 10. Durable Job Queue

A durable queue stores tasks for later processing, such as reservation expiry, notification delivery and payment reconciliation.

### 11. Worker Instances

Workers process queued jobs independently from the user-facing API. Multiple workers can handle growing backlogs, and failed jobs can be retried according to defined policies.

### 12. External Payment Provider

The payment provider processes payment details and returns trusted outcomes that TicketHub uses to confirm or reject purchases.

Payment operations require authentication, idempotency and reconciliation to avoid duplicate charges or incorrect order status.

## 10. Step-by-Step Request Flows

### 10.1 Browsing Events and Viewing Seats

1. A user opens TicketHub in a browser or mobile application.
2. DNS resolves the TicketHub domain, and the CDN returns cached public frontend assets where possible.
3. The client sends `GET /api/v1/events` to retrieve a paginated list of events.
4. The waiting room or rate limiter controls admission when traffic is unusually high.
5. The load balancer forwards the request to a healthy application server.
6. The application checks whether the event data is already available in the cache.
7. On a cache miss, the application retrieves appropriate read-only data from the database replica when suitable.
8. The application returns a JSON response and may cache the result for later requests.
9. When the user selects an event, the client requests `GET /api/v1/events/{eventId}/seats`.
10. The application returns a seat-availability snapshot.

The snapshot helps the user choose seats, but it does not reserve any of them. A later hold request must check the authoritative seat state again.

### 10.2 Holding Seats and Purchasing Tickets

1. The user selects one or more seats and submits the reservation form.
2. The client sends `POST /api/v1/events/{eventId}/holds` with the selected seat IDs and an idempotency key.
3. The load balancer sends the request to a healthy application server.
4. The application validates authentication, ownership rules, sale timing and the requested seat selection.
5. The application creates a pending order in a database transaction.
6. The database atomically changes the requested seats from available to held only if they are still eligible for reservation.
7. The application verifies that every requested seat was reserved. If any seat could not be held, it rolls back the complete transaction and returns `409 Conflict`.
8. If successful, the transaction commits and the application returns the hold ID and expiration time.
9. The client proceeds to checkout and sends `POST /api/v1/orders/{orderId}/payment`.
10. The application verifies the order and hold, then communicates with the external payment provider.
11. After receiving a trusted successful payment result, the application confirms the purchase in a transaction, marks the order paid and marks its seats sold.
12. A durable job may be queued to send confirmation or perform other non-critical work.
13. The user can retrieve confirmed tickets through `GET /api/v1/users/me/tickets`.

If a hold expires or payment fails, the system releases the seats according to its reservation rules. If the result of a payment is uncertain, the application reconciles that result rather than blindly retrying a charge.

## 11. Trade-Offs

### Trade-Off 1: Fairness Versus Immediate Access

Allowing every user to make requests immediately seems simple, but a large sale can overwhelm application servers and disadvantage users with slower devices or repeated refresh attempts.

A waiting room can regulate admission and provide a consistent queue policy. The trade-off is that some users must wait longer before reaching the seat-selection page.

The system should make admission rules clear and enforce them on the server rather than relying on the browser.

### Trade-Off 2: Strong Consistency Versus Read Performance

Serving browsing requests from caches and read replicas improves performance and reduces pressure on the primary database.

However, replicas and caches can temporarily contain outdated seat information.

The design therefore uses caches and replicas for suitable browsing reads, but relies on atomic operations against authoritative seat state for holds and completed sales. This gives up some potential read performance in the critical purchase path in exchange for correctness.

### Trade-Off 3: Temporary Holds Versus Inventory Utilization

Temporary holds prevent several buyers from paying for the same seat while one customer checks out.

However, abandoned holds can make seats unavailable for a short period even when the customer does not intend to purchase them.

Short expiration times, cleanup workers and safe hold renewal rules reduce this problem. A hold must never be extended indefinitely without an explicit and controlled policy.

### Trade-Off 4: Queue Admission Versus User Experience

A waiting room reduces sudden load on the application and database, and can improve fairness during a major sale.

However, users may see a waiting screen instead of immediate access. The system must explain the waiting process and avoid losing legitimate users during refreshes or temporary connection failures.

### Trade-Off 5: Reservation Correctness Versus Implementation Complexity

Transactions, conditional updates, idempotency keys and payment reconciliation protect against duplicate reservations and charges.

They also make the checkout workflow more complicated than simply marking a seat as sold in the browser.

The additional complexity is justified because an incorrect booking can cause financial loss, customer complaints and operational problems.

## 12. Avoiding Single Points of Failure

### Application Servers

Deploy at least two independent application-server instances behind the load balancer. Health checks remove unhealthy instances from traffic, while deployments across availability zones reduce the effect of a single-machine or single-zone failure.

### Load Balancer and DNS

Use managed or redundant load-balancing and DNS services rather than depending on one manually operated machine.

### Database

Use a database platform with a primary-replica topology and a defined failover procedure. Keep backups separate from the running database and test restoring them.

A read replica is not a substitute for a backup because accidental or corrupted changes may also be replicated.

### Cache

The cache improves performance but is not the authoritative record of seat ownership. If the cache fails, the application can continue consulting the database, though browsing may become slower.

### Job Queue and Workers

Use a durable, redundant queue and multiple worker instances. Monitor queue depth and failed jobs, and make tasks safe to retry.

### Payment Provider

Handle timeouts and uncertain payment results through idempotency and reconciliation rather than assuming a timeout means the payment failed. Maintain a clear process for recovering orders that are stuck between payment and confirmation.

### Seat Reservation Path

All competing reservation attempts must pass through the same authoritative consistency rules. A cache or read replica cannot independently approve a seat hold.

For deployments that distribute the database across several regions or partitions, the design must still guarantee a single authoritative reservation decision for each seat.

No design can eliminate every failure, but redundancy, monitoring, tested recovery and clear consistency rules reduce the likelihood that an individual component failure causes a system-wide outage or double-booking.

## 13. Conclusion

TicketHub must support normal browsing and purchasing while protecting scarce seat inventory during major sales.

The normal workload produces approximately 5.8 page requests per second on average, while a major sale can generate approximately 333 incoming purchase attempts per second over the initial ten-minute period under the stated assumptions.

The architecture uses a waiting room, rate limiting, a load balancer, multiple application servers, a cache, a primary database with a read replica, a durable job queue, background workers and a payment provider.

The most important design decision is to treat seat availability as an authoritative database state, not as a fact established by the browser or cache. Temporary holds, conditional updates and database transactions ensure that competing requests cannot both claim the same seat. Idempotency and payment reconciliation provide additional protection against duplicate purchases and uncertain payment outcomes.

The design balances traffic management, fairness, performance, availability and correctness so TicketHub can handle a major sale without selling more tickets than there are seats.