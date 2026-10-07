# Library Books REST API Design

This document describes a REST API for managing books in a library system.

The main resource is **books**.

## Base URL

https://api.example.com/books

## Endpoints

### 1. List all books

- **Method:** GET
- **Path:** `/books`
- **Description:** Returns a list of all books in the library.
- **Success status:** `200 OK`

### 2. Get one book

- **Method:** GET
- **Path:** `/books/:id`
- **Description:** Returns the details of one book using its unique ID.
- **Success status:** `200 OK`

Example:

- Request: `GET /books/25`
- Response: Book with ID `25`

### 3. Create a book

- **Method:** POST
- **Path:** `/books`
- **Description:** Creates a new book in the library.
- **Success status:** `201 Created`

Example request body:

    {
      "title": "Things Fall Apart",
      "author": "Chinua Achebe",
      "isbn": "9780385474542",
      "year": 1958
    }

### 4. Update a book

- **Method:** PUT
- **Path:** `/books/:id`
- **Description:** Replaces the information for an existing book.
- **Success status:** `200 OK`

Example request body:

    {
      "title": "Things Fall Apart",
      "author": "Chinua Achebe",
      "isbn": "9780385474542",
      "year": 1958
    }

### 5. Delete a book

- **Method:** DELETE
- **Path:** `/books/:id`
- **Description:** Removes a book from the library.
- **Success status:** `204 No Content`

Example:

- Request: `DELETE /books/25`

### 6. List books by author

- **Method:** GET
- **Path:** `/books?author=Chinua%20Achebe`
- **Description:** Returns books written by the specified author using a query parameter.
- **Success status:** `200 OK`

Example:

- Request: `GET /books?author=Chinua%20Achebe`

## Error Codes

### 400 Bad Request

- **Meaning:** The server cannot process the request because the client sent invalid or incomplete data.
- **Example:** A POST request attempts to create a book without a required title or author.

Example:

    POST /books

    {
      "title": "",
      "author": "Chinua Achebe"
    }

The server could respond with:

    400 Bad Request

### 404 Not Found

- **Meaning:** The requested resource does not exist.
- **Example:** A client requests a book ID that is not stored in the library.

Example:

    GET /books/9999

The server could respond with:

    404 Not Found

## REST Design Principles Used

- `GET` is used to read resources.
- `POST` is used to create a resource.
- `PUT` is used to update a resource.
- `DELETE` is used to remove a resource.
- `/books` represents the books resource using a noun.
- `/books/:id` identifies one specific book.
- Query parameters such as `?author=` are used to filter or search the collection.