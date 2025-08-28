import db from '../config/db.js';

async function insertEvent(event) {
  const conn = db.getconn();
  const query = `
    INSERT INTO historical_events 
    (event_id, event_name, description, start_date, end_date, duration_minutes, parent_event_id, research_value, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  await conn.execute(query, [
    event.event_id,
    event.event_name,
    event.description,
    event.start_date,
    event.end_date,
    event.duration_minutes,
    event.parent_event_id,
    event.research_value,
    JSON.stringify(event.metadata || {})
  ]);
}

async function getEventById(eventId) {
  const conn = db.getconn();
  const query = 'SELECT * FROM historical_events WHERE event_id = ?';
  const [rows] = await conn.execute(query, [eventId]);
  return rows[0];
}

async function getEventsByParentId(parentId) {
  const conn = db.getconn();
  const query = 'SELECT * FROM historical_events WHERE parent_event_id = ? ORDER BY start_date';
  const [rows] = await conn.execute(query, [parentId]);
  return rows;
}

async function searchEvents(filters, limit, offset) {
  const conn = db.getconn();
  let query = 'SELECT * FROM historical_events WHERE 1=1';
  const params = [];

  if (filters.name) {
    query += ' AND event_name LIKE ?';
    params.push(`%${filters.name}%`);
  }

  if (filters.start_date_after) {
    query += ' AND start_date >= ?';
    params.push(filters.start_date_after);
  }

  if (filters.end_date_before) {
    query += ' AND end_date <= ?';
    params.push(filters.end_date_before);
  }

  query += ` LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

  const [rows] = await conn.execute(query, params);
  return rows;
}

async function countEvents(filters) {
  const conn = db.getconn();
  let query = 'SELECT COUNT(*) as count FROM historical_events WHERE 1=1';
  const params = [];

  if (filters.name) {
    query += ' AND event_name LIKE ?';
    params.push(`%${filters.name}%`);
  }

  if (filters.start_date_after) {
    query += ' AND start_date >= ?';
    params.push(filters.start_date_after);
  }

  if (filters.end_date_before) {
    query += ' AND end_date <= ?';
    params.push(filters.end_date_before);
  }

  const [rows] = await conn.execute(query, params);
  return rows[0].count;
}

async function getOverlappingEvents() {
  const conn = db.getconn();
  const query = `
    SELECT 
      e1.event_id as event1_id, e1.event_name as event1_name, 
      e1.start_date as event1_start, e1.end_date as event1_end,
      e2.event_id as event2_id, e2.event_name as event2_name,
      e2.start_date as event2_start, e2.end_date as event2_end,
      TIMESTAMPDIFF(MINUTE, 
        GREATEST(e1.start_date, e2.start_date),
        LEAST(e1.end_date, e2.end_date)
      ) as overlap_duration_minutes
    FROM historical_events e1
    JOIN historical_events e2 ON e1.event_id < e2.event_id
    WHERE e1.start_date < e2.end_date AND e1.end_date > e2.start_date
  `;
  
  const [rows] = await conn.execute(query);
  return rows;
}

async function getEventsInRange(startDate, endDate) {
  const conn = db.getconn();
  const query = `
    SELECT event_id, event_name, start_date, end_date
    FROM historical_events 
    WHERE start_date <= ? AND end_date >= ?
    ORDER BY start_date
  `;
  const [rows] = await conn.execute(query, [endDate, startDate]);
  return rows;
}

async function getAllEvents() {
  const conn = db.getconn();
  const query = 'SELECT * FROM historical_events ORDER BY start_date';
  const [rows] = await conn.execute(query);
  return rows;
}

// Job management
async function createJob(jobId) {
  const conn = db.getconn();
  const query = 'INSERT INTO ingestion_jobs (job_id) VALUES (?)';
  await conn.execute(query, [jobId]);
}

async function updateJob(jobId, updates) {
  const conn = db.getconn();
  let query = 'UPDATE ingestion_jobs SET ';
  const params = [];
  const fields = [];

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'errors') {
      fields.push('errors = ?');
      params.push(JSON.stringify(value));
    } else {
      fields.push(`${key} = ?`);
      params.push(value);
    }
  }

  query += fields.join(', ') + ' WHERE job_id = ?';
  params.push(jobId);

  await conn.execute(query, params);
}

async function getJob(jobId) {
  const conn = db.getconn();
  const query = 'SELECT * FROM ingestion_jobs WHERE job_id = ?';
  const [rows] = await conn.execute(query, [jobId]);
  return rows[0];
}

export {
  insertEvent,
  getEventById,
  getEventsByParentId,
  searchEvents,
  countEvents,
  getOverlappingEvents,
  getEventsInRange,
  getAllEvents,
  createJob,
  updateJob,
  getJob
};
