## Kelp Assg
## Setup Instructions

### Prerequisites
- Node.js 18+
- MySQL 8.0+

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd KelpAssg
```

2. Install dependencies
```bash
npm install
```
3. Database Configuration

Create MySQL database and update credentials in `config/db.js`:
```javascript
const conn = mysql.createPool({
    host: 'localhost',
    user: 'your_username',
    password: 'your_password',
    database: 'kelp'
});
```
4. Initialize Database Schema
```bash
mysql -u root -p < ddl.sql
```

5. Start Application
```bash
npm start
```

The server runs on port 3000 by default.

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Events Endpoints

#### 1. Ingest Events
Processes event data from file and stores in database.

**POST** `/events/ingest`

Request Body:
```json
{
  "filePath": "/path/to/events.txt"
}
```

#### 2. Check Ingestion Status
Returns processing status and error details.

**GET** `/events/ingestion-status/{jobId}`


#### 3. Search Events
Searches events with filters and pagination.

**GET** `/events/search`

Query Parameters:
- `name` (optional): Event name filter
- `start_date_after` (optional): Events starting after date
- `end_date_before` (optional): Events ending before date
- `page` (optional): Page number, default 1
- `limit` (optional): Results per page, default 10


#### 4. Get Timeline
Returns hierarchical event structure with children.

**GET** `/timeline/{rootEventId}`


### Insights Endpoints

#### 5. Get Overlapping Events
Finds events with temporal overlaps.

**GET** `/insights/overlapping-events`

#### 6. Get Temporal Gaps
Finds largest time gap between events in date range.

**GET** `/insights/temporal-gaps`

Query Parameters:
- `startDate` (required): Analysis start date
- `endDate` (required): Analysis end date

#### 7. Get Event Influence
Finds shortest path between two events through parent-child relationships.

**GET** `/insights/event-influence`

Query Parameters:
- `sourceEventId` (required): Starting event ID
- `targetEventId` (required): Target event ID

## Postman Collection

```https://apnaghar.postman.co/workspace/New-Team-Workspace~8996a4b2-52f4-4218-879a-0f35cf9eaae0/collection/34247953-85ddb5d7-5381-42ac-a679-bd0dc435e9af?action=share&creator=34247953```

## File Format

Input files should use pipe-separated format:
```
eventId|eventName|startDate|endDate|parentId|researchValue|description
EVENT001|Sample Event|2023-01-01T10:00:00Z|2023-01-01T11:00:00Z|NULL|8|Event description
```

Required fields:
- eventId: Unique identifier
- eventName: Event name
- startDate/endDate: ISO 8601 format
- parentId: Parent event ID or NULL
- researchValue: Numeric value
- description: Text description

## Design Choices

### Architecture
- Routes handle HTTP requests
- Controllers contain business logic
- Models handle database operations
- Config manages database connections

### Data Processing
Event ingestion uses a two-pass approach to handle parent-child dependencies. Parent events are processed first, then children, ensuring foreign key constraints are satisfied.

### Temporal Analysis
Overlapping events are identified using SQL date range comparisons. Temporal gaps are calculated by sorting events chronologically and finding the largest time difference between consecutive events.

### Path Finding
Event influence uses Dijkstra's algorithm on a graph where events are nodes and parent-child relationships form directed edges. The shortest path considers event durations as weights.

### Database Design
The schema uses foreign key constraints to maintain data integrity. JSON fields store flexible metadata and error information. Indexes on date fields optimize temporal queries.


