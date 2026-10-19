# Day 7 Assignment: Scaling a Photo-Sharing App

## 1. Overview

SnapShare is a photo-sharing application where users upload photos and scroll through feeds containing photos from people they follow.

The system must handle photo uploads, feed requests, photo storage and thumbnail generation while remaining reliable and responsive as the number of users grows.

The proposed architecture uses a load balancer, multiple application servers, a cache, a database with a read replica, object storage, a Content Delivery Network (CDN) and a message queue with a background worker.

## 2. Assumptions

The following assumptions are used for the calculations:

- SnapShare has 10,000,000 registered users.
- 10% of registered users are active each day.
- Each daily active user uploads one photo per day.
- Each daily active user views 50 feed pages per day.
- Each original photo averages 2 MB.
- Each photo also has one thumbnail averaging 50 KB.
- A day contains 86,400 seconds.
- A year contains 365 days.
- Peak feed traffic is five times the average traffic.
- Storage calculations use decimal units: 1 MB = 1,000 KB, 1 GB = 1,000 MB and 1 TB = 1,000 GB.
- All uploaded photos and thumbnails are retained for the year.
- Storage calculations exclude backups, replicas, temporary files and other overhead.
- Feed views refer to requests for feed pages, not individual photo or thumbnail requests.

## 3. Capacity Estimates

### Daily Active Users

Registered users: 10,000,000

Daily active percentage: 10%

Calculation:

Daily active users = 10,000,000 × 0.10

**Daily active users = 1,000,000**

SnapShare therefore has approximately one million active users per day.

### Photo Uploads Per Day

Each daily active user uploads one photo.

Calculation:

Daily uploads = 1,000,000 × 1

**Daily uploads = 1,000,000 photos**

### Average Uploads Per Second

Seconds per day = 86,400

Calculation:

Average uploads per second = 1,000,000 ÷ 86,400

**Average upload rate ≈ 11.6 photos per second**

This is an average. Actual upload traffic will vary throughout the day.

### Feed Views Per Day

Each daily active user views 50 feed pages.

Calculation:

Daily feed views = 1,000,000 × 50

**Daily feed views = 50,000,000**

### Average Feed Views Per Second

Calculation:

Average feed views per second = 50,000,000 ÷ 86,400

**Average feed view rate ≈ 579 requests per second**

### Peak Feed Views Per Second

Peak traffic is assumed to be five times the average.

Calculation:

Peak feed views per second = 579 × 5

**Peak feed view rate ≈ 2,895 requests per second**

The system should be designed to handle approximately 2,895 feed-page requests per second during peak periods, with additional capacity for individual image requests.

These are planning estimates rather than guarantees about actual traffic.

## 4. Photo Storage Per Year

### Original Photos

Daily uploads = 1,000,000

Annual uploads = 1,000,000 × 365

Annual uploads = 365,000,000 photos

Each original photo averages 2 MB.

Calculation:

Annual original-photo storage = 365,000,000 × 2 MB

Annual original-photo storage = 730,000,000 MB

**Annual original-photo storage = 730 TB**

### Thumbnails

Each thumbnail averages 50 KB, which is equal to 0.05 MB.

Calculation:

Annual thumbnail storage = 365,000,000 × 0.05 MB

Annual thumbnail storage = 18,250,000 MB

**Annual thumbnail storage = 18.25 TB**

### Total Storage Per Year

Total annual storage = Original-photo storage + Thumbnail storage

Total annual storage = 730 TB + 18.25 TB

**Total annual storage = 748.25 TB**

SnapShare therefore needs approximately 748.25 TB of storage for one year of newly uploaded originals and thumbnails.

This estimate assumes no photo deletions and excludes storage overhead, backups, replication and other file versions. If photos are retained indefinitely, the storage requirement will continue growing each year.

## 5. Is SnapShare Read-Heavy or Write-Heavy?

SnapShare is expected to be a **read-heavy system**.

Each active user uploads one photo per day but views 50 feed pages per day. This means there are approximately 50 feed-page views for every photo upload.

Based on the provided activity assumptions, the system has far more feed-page requests than upload operations.

The architecture should therefore optimize feed retrieval and photo delivery. Caching frequently requested feed data, using database read replicas and delivering images through a CDN can reduce response times and protect the application servers and primary database from excessive read traffic.

The system must still support reliable photo uploads, but read performance is the main scaling priority under these assumptions.

## 6. Why Photos Should Not Be Stored Inside the Database

Original photos and thumbnails should be stored in object storage rather than directly inside the relational database.

Photo files are large binary objects, and storing hundreds of terabytes of them inside the database would increase database storage requirements and make backups and data transfer more expensive.

Object storage is designed to store large quantities of files and allows the application to retrieve them using object keys or URLs.

The database should instead store metadata such as the photo ID, owner ID, caption, upload time, object-storage key and thumbnail key.

This separation allows the database to manage structured information while object storage manages the actual photo files.

## 7. Proposed Architecture Diagram

The following text diagram shows how the main components work together.

    USERS: WEB OR MOBILE CLIENTS
                  |
                  | Feed requests and API requests
                  v
          LOAD BALANCER
                  |
                  v
       +----------------------+
       |   APP SERVERS        |
       | Multiple instances   |
       +----------------------+
          |        |       |
          |        |       +----------------------+
          |        |                              |
          v        v                              v
       CACHE   PRIMARY DATABASE              JOB QUEUE
          |        |                              |
          |        | Replication                  v
          |        v                       THUMBNAIL WORKER
          |   READ REPLICA                         |
          |        |                              |
          +--------+                              v
             Feed metadata                  OBJECT STORAGE
                                                  |
                                                  v
                                                 CDN
                                                  |
                                                  v
                                       PHOTO AND THUMBNAIL
                                             DELIVERY

    PHOTO UPLOAD PATH:

    CLIENT
       |
       v
    LOAD BALANCER
       |
       v
    APP SERVER
       |
       +----> PRIMARY DATABASE
       |       (Photo metadata)
       |
       +----> OBJECT STORAGE
       |       (Original photo)
       |
       +----> JOB QUEUE
                    |
                    v
             THUMBNAIL WORKER
                    |
                    v
             OBJECT STORAGE
             (Generated thumbnail)

    FEED IMAGE DELIVERY:

    CLIENT --> CDN --> OBJECT STORAGE

The diagram is logical rather than a fixed deployment topology. In a production system, clients can upload directly to object storage using a short-lived signed upload URL issued by an application server. This avoids routing large photo files through the application servers.

## 8. Components and the Problems They Solve

### 1. Load Balancer

The load balancer distributes incoming API requests across multiple application servers so that one server does not become a bottleneck.

### 2. Application Servers

Application servers handle authentication, permissions, upload coordination, feed generation, database operations and other application logic.

### 3. Cache

The cache stores frequently requested feed data or metadata so the application can respond faster and reduce repeated database queries.

### 4. Primary Database

The primary database stores structured information such as users, follows, photo metadata and upload status, and handles database writes.

### 5. Database Read Replica

The read replica serves eligible read queries separately from the primary database, reducing read load on the primary and increasing read capacity.

### 6. Object Storage

Object storage holds original photos and generated thumbnails without placing large image files directly inside the relational database.

### 7. Content Delivery Network (CDN)

The CDN caches and delivers photo files from locations closer to users, reducing latency and the number of requests that must reach the storage origin.

### 8. Job Queue

The job queue holds thumbnail-generation tasks so that image processing can happen asynchronously instead of delaying the initial upload response.

### 9. Thumbnail Worker

The thumbnail worker retrieves queued jobs, reads original photos from object storage, generates smaller thumbnail images and stores the results back in object storage.

### 10. Users' Devices

Web browsers and mobile applications allow users to upload photos, request their feeds and view original images or thumbnails.

## 9. Step-by-Step Photo Upload Flow

1. A user selects a photo in the SnapShare web or mobile application and begins the upload process.

2. The client sends an API request through the load balancer to an application server to initiate the upload.

3. The application server authenticates the user, checks the user's permissions and validates the file type and size.

4. The application server provides a short-lived signed upload URL that allows the client to upload the file directly to object storage.

5. The client uploads the original photo to object storage using the signed URL. The large file does not need to pass through the application server.

6. After the upload succeeds, the application confirms the upload and records or finalizes the photo metadata in the primary database.

7. The application adds a thumbnail-generation job to the job queue. The job contains enough information for the worker to locate the original photo.

8. A thumbnail worker retrieves the job from the queue and reads the original photo from object storage.

9. The worker generates a smaller thumbnail, stores the thumbnail in object storage and updates the relevant metadata or processing status in the database.

10. The feed can now include the photo's metadata and references to the original image and thumbnail. If thumbnail processing is still underway, the application can show a temporary placeholder.

11. When a user scrolls through the feed, the application retrieves feed metadata using the cache and database read replica where appropriate.

12. The client requests the image using its CDN URL. The CDN serves a cached copy if one is available, or retrieves the file from object storage when necessary.

This flow separates uploading, metadata management, background processing and image delivery so that a slow thumbnail job does not have to delay the original photo upload.

## 10. Scaling Trade-Offs

### Trade-Off 1: Caching Versus Data Freshness

Caching reduces repeated database queries and makes feed requests faster. However, cached information can become stale when a user uploads or deletes a photo or changes who they follow.

SnapShare must decide when to invalidate or refresh cached feed data. A more aggressive cache improves performance but may temporarily show outdated information.

### Trade-Off 2: Asynchronous Thumbnail Generation Versus Immediate Availability

A job queue allows the original upload to finish without waiting for a thumbnail to be generated. This improves responsiveness and lets workers process tasks independently.

However, the thumbnail may not be available immediately. The system must track processing status, retry failed jobs and handle jobs that repeatedly fail.

### Trade-Off 3: Read Replicas Versus Data Freshness

Read replicas increase the database's capacity for read operations and reduce pressure on the primary database.

However, replication can lag behind the primary. A newly uploaded photo may not immediately appear in a query served by a replica. The application may need to use the primary for certain fresh reads or account for the delay.

### Trade-Off 4: Object Storage Versus Simplicity

Object storage is suitable for large photo collections and works well with a CDN. It also keeps large image files separate from relational data.

However, photo files and their metadata are stored in different systems. The application must handle partial failures, such as a photo upload succeeding while a database update fails. Upload states, retries and cleanup of incomplete uploads are important.

## 11. Conclusion

SnapShare is expected to have one million daily active users, approximately 11.6 uploads per second, around 579 average feed-page requests per second and approximately 2,895 peak feed-page requests per second.

It will generate about 748.25 TB of original-photo and thumbnail data per year under the stated assumptions.

Because the system is read-heavy, the proposed architecture emphasizes caching, database read replicas and CDN-based photo delivery. Object storage manages image files, while a job queue and background worker handle thumbnail generation asynchronously.

The design separates concerns so that the application can scale individual components as traffic and storage requirements grow.