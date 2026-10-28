# Day 8 Assignment: TicketHub Event Ticketing System

## 1. Context and Overview

TicketHub is an online event-ticketing platform where users browse concerts and other events, view seat availability, temporarily reserve seats, pay for tickets, and view their purchases.

The system has two very different traffic patterns. On a normal day, users browse events and purchase tickets at a manageable rate. When a popular concert goes on sale, a large number of users may arrive almost simultaneously and compete for a limited inventory of seats.

TicketHub must handle sudden traffic spikes while keeping seat availability accurate, processing payments reliably, and providing a fair purchasing experience. Its most important correctness requirement is that a seat must never be sold to two different customers.

## 2. Requirements

### 2.1 Functional Requirements

1. Users can register, sign in, and authenticate securely.
2. Users can browse events and view event details, venue information, dates, and ticket prices.
3. Users can view seats and an availability snapshot for a selected event.
4. Users can temporarily hold available seats while completing checkout.
5. A seat hold expires after a defined period if checkout is not completed.
6. Users can pay for an order through an external payment provider.
7. Successful payment results in a confirmed order and sold seats.
8. Users can view their purchased tickets.
9. The system returns clear messages when seats are unavailable, reservations expire, or payments fail.
10. The system can release expired or abandoned reservations.

### 2.2 Non-Functional Requirements

- **Performance:** Aim for common event-browsing API responses under 300 milliseconds at the 95th percentile during normal operation, excluding third-party payment-provider delays.
- **Correctness:** A seat can belong to at most one active reservation or completed sale at a time. Concurrent requests must not successfully reserve the same seat.
- **Availability:** Target 99.9% service availability and recover from individual application-server failures.
- **Scalability:** Handle normal traffic and sharp sale-time spikes by scaling application instances and protecting downstream systems.
- **Fairness:** Use a clearly communicated waiting-room or admission policy for major sales rather than allowing repeated refreshes to provide an unlimited advantage.
- **Security:** Use HTTPS, authenticate users, authorize access to orders, validate input, and avoid storing raw payment-card details.
- **Reliability:** Handle retries and failures in reservation and payment workflows without creating duplicate orders or charges.
- **Durability:** Confirmed orders and ticket records must survive application-server restarts and normal infrastructure failures.

## 3. Scale Estimates

### 3.1 Given Facts and Assumptions

Given facts:

- Registered users: 2,000,000.
- Normal daily visitors: 50,000.
- Pages viewed per normal daily visitor: 10.
- Tickets sold on a normal day: 5,000.
- People trying to buy during a popular sale: 200,000.
- Seats available during that sale: 20,000.
- Initial major-sale period: 10 minutes.

Assumptions used for the estimates:

- A day contains 86,400 seconds.
- For the baseline estimate, one page view is counted as one page-reading request.
- A real page may generate several API requests, so measured API request traffic may be higher.
- Major-sale purchase attempts are averaged across the first 10 minutes, although real arrivals may be burstier.
- Each of the 200,000 prospective buyers attempts at least one purchase during that period.
- The estimates are planning figures rather than measured production traffic.

### 3.2 Normal Daily Page Requests

Normal daily visitors = 50,000.

Page views per visitor = 10.

Daily page requests = 50,000 × 10 = **500,000 page requests per day**.

Average page requests per second = 500,000 ÷ 86,400 ≈ **5.79 requests per second**.

As an additional planning assumption, if a normal peak is five times the average:

5.79 × 5 ≈ **29 requests per second**.

The five-times factor is an assumption for planning, not a supplied fact.

### 3.3 Normal Ticket Sales

Normal daily sales = 5,000 tickets.

Average completed ticket sales per second = 5,000 ÷ 86,400 ≈ **0.058 tickets per second**.

This is a count of completed ticket sales, not all database writes. One purchase may require several writes, including creating an order, reserving seats, recording a payment result, and confirming the order.

### 3.4 Major-Sale Purchase Attempts

The major sale attracts 200,000 prospective buyers over 10 minutes.

10 minutes = 600 seconds.

Average purchase attempts per second = 200,000 ÷ 600 ≈ **333.33 purchase attempts per second** during the ten-minute window.

This is the average incoming purchase-attempt rate, not the full API request rate. Each user may browse events, load seat maps, attempt a hold, and make a payment request, so total API traffic may be higher.

### 3.5 Major-Sale Seat Supply and Demand

Available seats = 20,000.

Prospective buyers = 200,000.

Demand-to-supply ratio = 200,000 ÷ 20,000 = **10 prospective buyers per seat**.

If all 20,000 seats are sold uniformly across the 600-second period, the average completed sale rate is 20,000 ÷ 600 ≈ **33.33 seats per second**.

This does not mean all buyers can get a ticket. TicketHub must reject losing reservation attempts cleanly and must never oversell the inventory.

### 3.6 Comparison and Design Implications

| Metric | Normal day | Major sale |
|---|---:|---:|
| Visitors or prospective buyers | 50,000 per day | 200,000 in 10 minutes |
| Page requests or purchase attempts | 500,000 page requests per day | At least 200,000 purchase attempts |
| Average estimated rate | 5.79 page requests/second | 333.33 purchase attempts/second |
| Ticket supply | 5,000 tickets sold per day | 20,000 seats available |
| Main concern | Consistent browsing and sales | Burst traffic, fairness, contention, and overselling |

The major-sale average attempt rate is roughly 57 times the normal average page-request rate. These measure different activities, so this comparison is a rough indication of intensity, not a claim that total API traffic is exactly 57 times higher.

The numbers suggest using a waiting room or rate limiter, multiple application servers, caching for public event information, and an authoritative transactional reservation path. A cached seat map can help the user browse, but it cannot make the final reservation decision.

## 4. API Design

The proposed API uses resource-oriented paths, standard HTTP methods, and JSON request and response bodies. The base URL below is illustrative, not a deployed endpoint.

Base URL: `https://api.tickethub.example.com/api/v1`

### 4.1 Browse Events

- **Method:** GET
- **Path:** `/events?page=1&limit=20`
- **Purpose:** Return a paginated list of events.
- **Success status:** `200 OK`

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

### 4.2 View Event Details

- **Method:** GET
- **Path:** `/events/{eventId}`
- **Purpose:** Return an event's venue, schedule, and sale details.
- **Success status:** `200 OK`
- **Failure example:** `404 Not Found` if the event does not exist or is unavailable to the requester.

### 4.3 View Seats

- **Method:** GET
- **Path:** `/events/{eventId}/seats`
- **Purpose:** Return a seat map and availability snapshot for an event.
- **Success status:** `200 OK`

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

The response is a snapshot and may be slightly stale. The hold endpoint must validate seats against authoritative database state.

### 4.4 Hold Seats

- **Method:** POST
- **Path:** `/events/{eventId}/holds`
- **Purpose:** Temporarily reserve all requested seats while the user checks out.
- **Success status:** `201 Created`

Example request:

    {
      "seatIds": [5001, 5002],
      "idempotencyKey": "purchase-session-abc123"
    }

Example response:

    {
      "holdId": 9001,
      "eventId": 101,
      "seatIds": [5001, 5002],
      "status": "held",
      "expiresAt": "2026-10-28T19:15:00Z"
    }

If one or more seats cannot be held, the system should roll back the whole multi-seat operation and return `409 Conflict`, rather than silently creating a partial hold.

### 4.5 Pay for an Order

- **Method:** POST
- **Path:** `/orders/{orderId}/payment`
- **Purpose:** Initiate or confirm payment for an order with a valid seat hold.
- **Success status:** `200 OK` if payment is confirmed synchronously, or `202 Accepted` if the result is still being processed.

Example request:

    {
      "paymentMethodToken": "payment-provider-token",
      "idempotencyKey": "payment-attempt-abc123"
    }

Example confirmed response:

    {
      "orderId": 7001,
      "status": "paid",
      "amountCents": 15000,
      "currency": "USD"
    }

The payment token is a provider reference. TicketHub should not store raw card details. The backend must avoid duplicate charges and must not confirm a purchase unless the order and seat hold are valid.

### 4.6 View My Tickets

- **Method:** GET
- **Path:** `/users/me/tickets`
- **Purpose:** Return tickets belonging to the authenticated user.
- **Success status:** `200 OK`

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

The server derives the current user from the authentication token and returns only that user's tickets.

### 4.7 Release a Hold

- **Method:** DELETE
- **Path:** `/holds/{holdId}`
- **Purpose:** Release a user's temporary reservation when checkout is cancelled.
- **Success status:** `204 No Content`

The backend verifies ownership and current hold status before releasing seats. An expiration worker can also release eligible expired holds.

### 4.8 Common Error Responses

- `400 Bad Request`: malformed or invalid request data.
- `401 Unauthorized`: missing, expired, or invalid authentication.
- `403 Forbidden`: authenticated user is not allowed to perform the action.
- `404 Not Found`: requested resource does not exist or is not accessible.
- `409 Conflict`: one or more selected seats are already held or sold.
- `422 Unprocessable Content`: request is valid JSON but violates a business rule.
- `429 Too Many Requests`: client has exceeded an allowed request rate.
- `500 Internal Server Error`: unexpected server-side failure.

Example conflict response:

    {
      "error": {
        "code": "SEAT_UNAVAILABLE",
        "message": "One or more selected seats are no longer available."
      }
    }

## 5. Data Model

The required core entities are users, events, seats, and orders. An additional `order_items` table links orders to the seats they contain and preserves the price recorded for each ordered seat.

### 5.1 Users

- `id`: INTEGER primary key.
- `name`: TEXT, required.
- `email`: TEXT, required and unique.

### 5.2 Events

- `id`: INTEGER primary key.
- `name`: TEXT, required.
- `venue`: TEXT, required.
- `starts_at`: TEXT, required event start time.
- `sales_open_at`: TEXT, required time ticket sales begin.

### 5.3 Orders

- `id`: INTEGER primary key.
- `user_id`: foreign key to `users.id`.
- `event_id`: foreign key to `events.id`.
- `status`: pending, paid, expired, or cancelled.
- `idempotency_key`: identifies repeated logical requests.
- `created_at`: time order was created.
- `expires_at`: expiration time for a pending hold or order.

### 5.4 Seats

- `id`: INTEGER primary key.
- `event_id`: foreign key to `events.id`.
- `seat_label`: seat identifier such as `A-01`.
- `price_cents`: non-negative price in the smallest currency unit.
- `status`: available, held, or sold.
- `current_order_id`: nullable foreign key to `orders.id`.
- `hold_expires_at`: expiry time of a temporary hold.

The combination of `event_id` and `seat_label` is unique, so an event cannot have two records for the same seat label. The current seat status is authoritative for whether that seat can be reserved.

### 5.5 Order Items

- `id`: INTEGER primary key.
- `order_id`: foreign key to `orders.id`.
- `seat_id`: foreign key to `seats.id`.
- `price_cents`: agreed price for the seat in this order.

The pair `(order_id, seat_id)` is unique to prevent a seat being listed twice within one order.

### 5.6 Relationships

- **Users to Orders:** one-to-many; one user can make many orders, and each order belongs to one user.
- **Events to Seats:** one-to-many; one event has many seats, and each seat belongs to one event.
- **Events to Orders:** one-to-many; an event can be referenced by many orders.
- **Orders to Order Items:** one-to-many; an order may contain multiple seats.
- **Seats to Order Items:** a seat may appear in historical order items over time, but the authoritative current seat status and order determine whether it is currently held or sold.

The `order_items` join table avoids storing a comma-separated list of seat IDs inside an order. It also records the price agreed for each seat.

### 5.7 SQLite Schema

The following example uses SQLite-compatible SQL. Enable foreign-key enforcement on the connection.

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

This schema provides a starting structure for the system. A production implementation should also define payment records, inventory policies, cancellation rules, audit history, and stronger database-specific constraints where appropriate.

### 5.8 Indexes

    CREATE INDEX idx_seats_event_status
    ON seats(event_id, status);

    CREATE INDEX idx_orders_user_created
    ON orders(user_id, created_at DESC);

    CREATE INDEX idx_order_items_order
    ON order_items(order_id);

The seat index helps list and filter seats for one event. The orders index helps retrieve a user's order history. The order-items index helps retrieve the seats in an order. Indexes improve appropriate reads but consume storage and add overhead to writes.

## 6. Preventing Double-Booking

A browser seat map is only an availability snapshot. Two customers may see the same seat as available and click it at almost the same time. Therefore, the browser must never make the final booking decision; the backend and authoritative database must.

### 6.1 Reservation Process

1. The user selects seats and submits a hold request.
2. The server authenticates the user and validates the event and requested seat IDs.
3. A database transaction creates a pending order and conditionally changes every requested seat from `available` to `held`.
4. The database operation succeeds only for seats that are still available or whose prior hold has expired.
5. The application checks that the number of updated rows equals the number of requested seats.
6. If every seat was successfully held, the transaction records the related order items and commits.
7. If any seat could not be held, the application rolls back the entire transaction and returns `409 Conflict`.
8. After a trusted payment success, a new short transaction checks that the hold still belongs to the order and is valid, marks the order paid, and marks the seats sold.
9. If the hold expires or payment fails, the system cancels or expires the order and releases the seats according to the defined rules.

### 6.2 Conditional Update Pattern

Conceptually, the reservation operation uses a conditional update like this:

    UPDATE seats
    SET status = 'held',
        current_order_id = :order_id,
        hold_expires_at = :hold_expiry
    WHERE event_id = :event_id
      AND id IN (:requested_seat_ids)
      AND (
        status = 'available'
        OR (
          status = 'held'
          AND hold_expires_at <= :current_time
        )
      );

The application must bind each requested ID safely, verify the seats belong to the selected event, and check the number of rows affected. In a real implementation, a variable-length list of seat IDs would use parameter placeholders rather than inserting raw input into SQL.

The reservation and order-item changes belong in one transaction. If the row count does not match the number of requested seats, the application rolls the transaction back. The exact locking mechanism depends on the database: a production relational database can use row-level locks or equivalent atomic conditional updates; SQLite serializes writers more broadly, so it is useful for a small demonstration but not a full high-concurrency ticketing implementation.

### 6.3 Why a Transaction Is Necessary

A transaction groups related changes so they succeed or fail together. If Amina and Brian compete for the same seat, only one transaction can successfully claim the seat from its available state. The other must see that the seat is no longer eligible and fail.

The unique constraint on `(event_id, seat_label)` prevents duplicate seat records for an event, but it does not alone prevent two orders from competing for the same existing seat. The atomic reservation logic is also required.

### 6.4 Holds, Payment, and Idempotency

A temporary hold prevents other customers from reserving the seat while the first customer checks out. For example, a hold may last ten minutes. If checkout is abandoned, an expiry worker releases the seat.

A successful hold does not yet mean the ticket is sold. After a payment provider confirms payment, TicketHub validates the active hold and commits the paid order and sold seat state.

If the payment result is uncertain, the system reconciles it rather than assuming a timeout means the payment failed. Idempotency keys let repeated requests for the same logical operation return or reconcile the original result instead of creating duplicate orders or charges.

## 7. High-Level Architecture

    +---------------------------------------------------+
    |                   CLIENT DEVICES                  |
    |              Browsers and mobile apps             |
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
    |             Caches public static assets            |
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
    | Event details and      |     | Authoritative orders |
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

    BACKGROUND PROCESSING

    APPLICATION SERVER
             |
             v
    +------------------------+
    | DURABLE JOB QUEUE      |
    +------------------------+
             |
             v
    +------------------------+
    | MULTIPLE WORKERS       |
    | Hold expiry,           |
    | notifications,         |
    | payment reconciliation |
    +------------------------+

    APPLICATION SERVER <-----> EXTERNAL PAYMENT PROVIDER

This diagram is a logical design, not a claim that the system has already been deployed. Production services should be distributed across redundant infrastructure and availability zones.

## 8. Components and the Problems They Solve

- **Client devices:** Let users browse events, choose seats, and interact with the API.
- **DNS:** Resolves the service domain to the correct public entry point.
- **CDN:** Delivers cached public static assets from nearby locations, reducing origin traffic and latency; private order data must not be publicly cached.
- **Waiting room and rate limiter:** Control admission and reduce the chance of a sale-time traffic spike overwhelming application and database layers.
- **Load balancer:** Distributes incoming requests across healthy app servers and removes unhealthy instances from rotation.
- **Application servers:** Authenticate users, validate requests, enforce business rules, coordinate reservation and payment operations, and return API responses.
- **Cache:** Speeds up repeated reads of suitable public event data and seat-availability snapshots; it is not the final authority for a reservation.
- **Primary database:** Stores authoritative seat states, orders, and purchase records and applies transactional reservation rules.
- **Read replica:** Serves suitable browsing and reporting queries to reduce read pressure on the primary; replication lag means it must not approve seat holds.
- **Durable job queue:** Stores background work until workers can process it and helps recover from temporary worker failures.
- **Worker instances:** Process hold expiry, notifications and reconciliation tasks independently of the request path.
- **External payment provider:** Processes payment details and supplies trusted payment outcomes without TicketHub storing raw card data.

## 9. Request Flows

### 9.1 Browsing Events and Viewing Seats (GET)

1. The user opens TicketHub in a browser or mobile application.
2. DNS resolves the service domain, and the CDN returns cached public frontend assets where possible.
3. The client sends `GET /api/v1/events` to retrieve a paginated list.
4. The waiting room or rate limiter regulates admission during a major sale.
5. The load balancer sends the request to a healthy application server.
6. The server checks the cache for suitable event information.
7. On a cache miss, the application retrieves suitable read-only information from the read replica, if appropriate.
8. The application returns JSON and may cache the result for future reads.
9. The user selects an event and the client requests `GET /api/v1/events/{eventId}/seats`.
10. The server returns an availability snapshot for display.

The seat snapshot is not a reservation. The later hold operation must validate the authoritative current state in the primary database.

### 9.2 Holding Seats and Paying (POST)

1. The user selects seats and submits a hold request with an idempotency key.
2. The application authenticates the user and validates the event and seat selection.
3. The application begins a database transaction and creates a pending order.
4. The database conditionally changes the requested seats from available to held.
5. The application verifies that all requested seats were held. If not, it rolls back the complete transaction and returns `409 Conflict`.
6. If successful, the application records the order items and commits the transaction.
7. The client starts checkout by sending a payment request for the order.
8. The backend communicates with the external payment provider and handles the result using idempotency and reconciliation rules.
9. After confirmed payment, the backend verifies that the hold is still valid and commits the order as paid and the seats as sold.
10. The application queues non-essential notifications or follow-up work.
11. The user retrieves purchased tickets through `GET /api/v1/users/me/tickets`.

If a hold expires or payment fails, the reservation is released according to the defined rules. An uncertain payment outcome must be reconciled rather than blindly charged again.

## 10. Trade-Offs

### 10.1 Fairness Versus Immediate Access

Allowing everyone to make requests immediately is simple, but a large sale can overwhelm the service and reward repeated refreshing. A waiting room controls admission and can improve fairness, but users must wait rather than entering immediately. Queue rules should be communicated clearly and enforced by the server.

### 10.2 Read Performance Versus Freshness

Caches and read replicas improve read performance and reduce primary-database work, but their data can be stale. TicketHub uses them for suitable browsing reads while relying on atomic operations against authoritative seat state for holds and sales. This sacrifices some potential performance on the critical purchase path in exchange for correctness.

### 10.3 Temporary Holds Versus Inventory Utilization

Holds prevent another customer from buying a seat during checkout, but abandoned holds temporarily reduce available inventory. Expiration times and cleanup workers release abandoned seats. Hold extensions need a defined limit so users cannot retain seats indefinitely without purchasing.

### 10.4 Redundancy Versus Cost and Complexity

Multiple application servers, database replication, durable queues and multiple workers reduce reliance on individual machines. They also increase cost and operational complexity and require failover testing, monitoring and careful deployment.

### 10.5 Correctness Versus Simplicity

Transactions, conditional updates, idempotency and payment reconciliation make checkout more complex than simply marking a seat sold in the browser. The complexity is justified because incorrect reservations can cause financial loss, duplicate charges and customer disputes.

## 11. Avoiding Single Points of Failure

- **Application servers:** Run at least two instances behind a load balancer, use health checks, and distribute instances across availability zones.
- **Load balancer and DNS:** Use managed or redundant services rather than relying on a single manually operated machine.
- **Database:** Use a defined primary failover process, maintain backups separately from the live database, and test recovery procedures. A replica is not a backup because accidental changes can also be replicated.
- **Cache:** Treat cache as an optimization, not the authoritative source. If it fails, fall back to the database where possible, accepting slower reads.
- **Queue and workers:** Use a durable queue and multiple worker instances, monitor queue depth and failed jobs, and make jobs safe to retry.
- **Payment provider:** Use idempotency and reconciliation for timeouts or uncertain results, and maintain a clear recovery process for orders stuck between payment and confirmation.
- **Seat reservation:** Ensure every competing reservation uses the same authoritative consistency rules; a cache or replica must not independently approve a seat hold.
- **Monitoring and recovery:** Monitor error rates, latency, database replication lag and queue depth; rehearse failover and restoration procedures.

No design can eliminate every failure, but redundancy, monitoring, tested recovery and explicit consistency rules reduce the chance that one component failure causes a system-wide outage or double-booking.

## 12. Conclusion

TicketHub needs to support normal browsing and purchasing while protecting scarce seat inventory during popular sales. Under the assumptions in this document, normal traffic is approximately 5.79 page requests per second, while a major sale averages about 333 purchase attempts per second over its first ten minutes.

The architecture includes a waiting room, rate limiting, a load balancer, multiple application servers, a cache, a primary database and read replica, a durable job queue, workers and an external payment provider.

The most important design decision is that availability displayed in the browser is only a snapshot. The server and primary database decide whether a seat can be reserved. Temporary holds, conditional updates and transactions ensure that competing requests cannot both claim the same seat. Idempotency and payment reconciliation provide additional protection against duplicate purchases or uncertain payment outcomes.

This design balances performance, fairness, availability and correctness while providing a path to scale the service as demand grows.
