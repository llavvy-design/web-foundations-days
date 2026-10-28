# Day 8 Reflection

## 1. What Was the Most Difficult Concept, and How Did I Overcome It?

The most difficult concept for me was understanding how a system can handle many users trying to perform the same action at the same time. The TicketHub assignment helped me understand why displaying an available seat in the browser is not enough to guarantee that the seat can be purchased. Two users could select the same seat almost simultaneously, so the server must use database transactions and conditional updates to ensure that only one reservation succeeds. I overcame this challenge by breaking the problem into smaller steps, from checking requirements and estimating traffic to designing the database and tracing the reservation process. Practising SQL, API requests and system architecture also helped me understand how the different components work together.

## 2. Which Part of My Capstone Would I Improve?

I would improve the explanation and demonstration of the critical request flows, particularly how the application handles errors and protects data consistency. I want to communicate more clearly why a cache cannot make the final decision about seat availability, how a transaction prevents double-booking and what happens when a payment result is uncertain. I would also make the architecture diagram easier to follow by showing the reservation and payment paths more clearly. I would use feedback from my instructor and classmates to prioritize these improvements and make the design easier for another developer to review.

## 3. What Will I Learn Next?

Next, I plan to build a real backend using Node.js and Express and connect it to a relational database such as PostgreSQL. I want to implement authentication, persistent note storage, input validation and API error handling instead of relying only on a practice API. I will also continue learning about transactions, concurrency, automated testing and deployment so I can build applications that are not only functional but also reliable, secure and ready to support real users.