# Finance Data Processing and Access Control Backend

A comprehensive backend system for managing financial records with role-based access control, built with Node.js, Express, and SQLite.

## Features

- **User Management**: Create, update, and manage users with role-based permissions
- **Role-Based Access Control**: Three-tier permission system (Viewer, Analyst, Admin)
- **Financial Records**: Complete CRUD operations for income and expense tracking
- **Dashboard Analytics**: Summary statistics, trends, and detailed analytics
- **Data Validation**: Comprehensive input validation and error handling
- **Security**: JWT authentication, rate limiting, and secure password hashing

## Architecture

### Technology Stack
- **Backend**: Node.js with Express.js
- **Database**: SQLite with foreign key constraints
- **Authentication**: JWT tokens
- **Validation**: Joi schema validation
- **Security**: Helmet, CORS, rate limiting

### Project Structure
```
finance-backend/
├── src/
│   ├── app.js                 # Main application entry point
│   ├── database/
│   │   └── init.js           # Database initialization and schema
│   ├── middleware/
│   │   ├── auth.js           # Authentication and authorization
│   │   └── validation.js     # Input validation schemas
│   └── routes/
│       ├── auth.js           # Authentication endpoints
│       ├── users.js          # User management
│       ├── finance.js        # Financial records CRUD
│       └── dashboard.js      # Analytics and summaries
├── data/                     # SQLite database directory
├── package.json
└── README.md
```

## Database Schema

### Users Table
- `id`: Primary key
- `username`: Unique username
- `email`: Unique email address
- `password_hash`: Bcrypt hashed password
- `role_id`: Foreign key to roles table
- `status`: Active/inactive status

### Roles Table
- `id`: Primary key
- `name`: Role name (viewer, analyst, admin)
- `permissions`: JSON array of permissions

### Financial Records Table
- `id`: Primary key
- `user_id`: Foreign key to users table
- `category_id`: Foreign key to categories table
- `amount`: Decimal amount
- `type`: Income or expense
- `date`: Transaction date
- `description`: Optional description

### Categories Table
- `id`: Primary key
- `name`: Category name
- `type`: Income or expense type

## Role Permissions

### Viewer
- `read_dashboard`: View dashboard summaries
- `read_records`: View financial records

### Analyst
- `read_dashboard`: View dashboard summaries
- `read_records`: View financial records
- `read_analytics`: Access detailed analytics

### Admin
- `read_dashboard`: View dashboard summaries
- `read_records`: View financial records
- `read_analytics`: Access detailed analytics
- `write_records`: Create, update, delete financial records
- `manage_users`: Manage user accounts

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify token validity

### Users
- `GET /api/users/profile` - Get current user profile
- `GET /api/users` - Get all users (admin only)
- `POST /api/users` - Create user (admin only)
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)
- `GET /api/users/roles` - Get available roles

### Financial Records
- `GET /api/finance` - Get financial records with filtering
- `GET /api/finance/:id` - Get single financial record
- `POST /api/finance` - Create financial record
- `PUT /api/finance/:id` - Update financial record
- `DELETE /api/finance/:id` - Delete financial record
- `GET /api/finance/categories` - Get categories
- `POST /api/finance/categories` - Create category (admin only)

### Dashboard
- `GET /api/dashboard/summary` - Get dashboard summary
- `GET /api/dashboard/analytics` - Get detailed analytics (analyst+)

### Health Check
- `GET /api/health` - API health status

## Installation and Setup

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Initialize Database**
   ```bash
   npm run init-db
   ```
   This creates the SQLite database with default roles and categories.

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Start Production Server**
   ```bash
   npm start
   ```

The server will start on port 3000 by default.

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=development
```

## Usage Examples

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password123"}'
```

### Create Financial Record
```bash
curl -X POST http://localhost:3000/api/finance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1500.00,
    "type": "income",
    "category_id": 1,
    "date": "2024-01-15",
    "description": "Monthly salary"
  }'
```

### Get Dashboard Summary
```bash
curl -X GET http://localhost:3000/api/dashboard/summary \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Default Data

### Default Roles
1. **Viewer**: Can view dashboard data and records
2. **Analyst**: Can view data and access analytics
3. **Admin**: Full access to all features

### Default Categories
**Income Categories:**
- Salary
- Freelance
- Investment

**Expense Categories:**
- Food
- Transport
- Utilities
- Entertainment
- Healthcare
- Shopping
- Other

## Security Features

- **Password Hashing**: Bcrypt with salt rounds of 10
- **JWT Authentication**: 24-hour token expiration
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Comprehensive Joi schema validation
- **SQL Injection Protection**: Parameterized queries
- **CORS**: Cross-origin resource sharing configuration
- **Helmet**: Security headers configuration

## Error Handling

The API provides consistent error responses:

```json
{
  "error": "Error message",
  "details": [
    {
      "field": "field_name",
      "message": "Specific validation error"
    }
  ]
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Database Operations

The application uses SQLite with the following features:
- Foreign key constraints
- Auto-incrementing primary keys
- Timestamp tracking (created_at, updated_at)
- Transaction support for data consistency

## Testing

Run tests with:
```bash
npm test
```

## Assumptions and Trade-offs

### Assumptions
- Single-tenant application (no multi-organization support)
- SQLite is sufficient for demonstration purposes
- JWT tokens are stored client-side
- Email notifications are not required
- File uploads are not needed

### Trade-offs
- **SQLite vs PostgreSQL**: Chose SQLite for simplicity and portability
- **JWT vs Sessions**: JWT for stateless authentication
- **In-house validation vs ORM**: Direct validation for better control
- **No caching**: Simplified implementation without Redis/memcached

## Future Enhancements

### Potential Improvements
- **Database Migration**: Add migration scripts for schema changes
- **API Documentation**: OpenAPI/Swagger specification
- **Unit Tests**: Comprehensive test coverage
- **Soft Deletes**: Implement soft delete functionality
- **Pagination**: Cursor-based pagination for large datasets
- **Search**: Full-text search capabilities
- **File Uploads**: Receipt/document attachments
- **Email Notifications**: Transaction alerts
- **Data Export**: CSV/PDF export functionality
- **Real-time Updates**: WebSocket integration
- **Microservices**: Split into separate services
- **Docker**: Containerization for deployment

### Scalability Considerations
- **Database**: Migration to PostgreSQL for production
- **Caching**: Redis for performance optimization
- **Load Balancing**: Multiple application instances
- **Monitoring**: Application performance monitoring
- **Logging**: Structured logging with ELK stack

## License

MIT License - feel free to use this project for learning or commercial purposes.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For questions or issues, please create an issue in the repository or contact the development team.
