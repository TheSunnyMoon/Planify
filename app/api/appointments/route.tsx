import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Get appointments for a specific date
export async function GET(request: Request) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = session.user.id;
    const userEmail = session.user.email;
    
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }
    
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL is not defined");
      return NextResponse.json({ error: "Incorrect server configuration" }, { status: 500 });
    }
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Get all appointments for the current user
    // (created by them or where they are a participant)
    const appointments = await sql`
      WITH user_appointments AS (
        -- Appointments created by the user
        SELECT a.*, u.name as creator_name
        FROM appointments a
        JOIN users u ON a.creator_id = u.id
        WHERE a.appointment_date::date = ${date}::date
        AND (
          a.creator_id = ${userId}
          OR EXISTS (
            SELECT 1 FROM appointment_participants ap 
            WHERE ap.appointment_id = a.id 
            AND (ap.user_id = ${userId} OR ap.email = ${userEmail})
          )
        )
      )
      SELECT 
        ua.*, 
        COALESCE(json_agg(
          json_build_object(
            'id', ap.id,
            'user_id', ap.user_id,
            'email', ap.email,
            'is_confirmed', ap.is_confirmed,
            'name', u.name
          )
        ) FILTER (WHERE ap.id IS NOT NULL), '[]') as participants
      FROM user_appointments ua
      LEFT JOIN appointment_participants ap ON ua.id = ap.appointment_id
      LEFT JOIN users u ON ap.user_id = u.id
      GROUP BY ua.id, ua.title, ua.description, ua.creator_id, ua.creator_name,
               ua.appointment_date, ua.appointment_time, ua.duration, ua.created_at
      ORDER BY ua.appointment_time ASC
    `;
    
    return NextResponse.json(appointments);
  } catch (error) {
    console.error("Error retrieving appointments:", error);
    return NextResponse.json({ 
      error: "Error retrieving appointments",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Create a new appointment
export async function POST(request: Request) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    const { title, description, appointmentDate, appointmentTime, duration, participants } = await request.json();
    
    // Data validation
    if (!title || !appointmentDate || !appointmentTime || !duration) {
      console.log('Missing data:', { title, appointmentDate, appointmentTime, duration });
      return NextResponse.json({ error: 'Missing information' }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL is not defined");
      return NextResponse.json({ error: "Incorrect server configuration" }, { status: 500 });
    }
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Check participants if present
    if (participants && participants.length > 0) {
      const emailList = participants.map((p: { email: string }) => p.email);
      
      // Search for emails in the database
      const existingUsers = await sql`
        SELECT email FROM users WHERE email IN ${sql(emailList)}
      `;
      
      // Get existing emails as an array
      const existingEmails = existingUsers.map((user: Record<string, any>) => user.email as string);
      
      // Find emails that are not in the database
      const unknownEmails = emailList.filter((email: string) => 
        !existingEmails.includes(email)
      );
      
      // If some participants don't exist, return an error
      if (unknownEmails.length > 0) {
        return NextResponse.json({ 
          error: 'Some participants are not registered users',
          code: 'UNKNOWN_PARTICIPANTS',
          unknownParticipants: unknownEmails
        }, { status: 400 });
      }
    }
    
    // Use default duration if not specified
    const appointmentDuration = duration || 30;
    
    // Create the appointment - approach without Promise in the transaction function
    let appointmentId;
    let result;

    await sql.transaction((tx) => {
      // 1. Insert the main appointment
      const insertAppointment = tx`
        INSERT INTO appointments (
          title, description, creator_id, appointment_date, appointment_time, duration
        ) VALUES (
          ${title}, ${description || null}, ${userId}, ${appointmentDate}, ${appointmentTime}, ${appointmentDuration}
        ) RETURNING id
      `;
      
      // 2. Create an array for participant insertion requests
      const participantQueries = [];
      
      // For each participant, prepare an SQL query (without await)
      if (participants && participants.length > 0) {
        for (const participant of participants) {
          const email = participant.email.trim();
          if (!email) continue;
          
          participantQueries.push(tx`
            WITH user_check AS (
              SELECT id FROM users WHERE email = ${email} LIMIT 1
            )
            INSERT INTO appointment_participants (
              appointment_id, user_id, email, is_confirmed
            ) 
            SELECT 
              (SELECT id FROM ${insertAppointment} LIMIT 1), 
              (SELECT id FROM user_check), 
              ${email}, 
              CASE WHEN (SELECT id FROM user_check) = ${userId} THEN true ELSE false END
          `);
        }
      }
      
      // Return an array with all queries to execute
      return [insertAppointment, ...participantQueries];
    });

    // After the transaction, get the ID and then the complete appointment
    const idResult = await sql`SELECT id FROM appointments ORDER BY created_at DESC LIMIT 1`;
    appointmentId = idResult[0].id;

    // Get the appointment with its participants
    const completeAppointment = await sql`
      SELECT 
        a.*, 
        u.name as creator_name,
        COALESCE(json_agg(
          json_build_object(
            'id', ap.id,
            'user_id', ap.user_id,
            'email', ap.email,
            'is_confirmed', ap.is_confirmed,
            'name', u2.name
          )
        ) FILTER (WHERE ap.id IS NOT NULL), '[]') as participants
      FROM appointments a
      JOIN users u ON a.creator_id = u.id
      LEFT JOIN appointment_participants ap ON a.id = ap.appointment_id
      LEFT JOIN users u2 ON ap.user_id = u2.id
      WHERE a.id = ${appointmentId}
      GROUP BY a.id, a.title, a.description, a.creator_id, u.name,
              a.appointment_date, a.appointment_time, a.duration, a.created_at
    `;

    result = completeAppointment[0];
    
    return NextResponse.json({ 
      success: true, 
      message: "Appointment created successfully",
      appointment: result
    });
    
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Error creating appointment',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}