import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Update an existing appointment
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { id } = params;
    
    const { title, description, appointmentDate, appointmentTime, duration, participants } = await request.json();
    
    // Data validation
    if (!title || !appointmentDate || !appointmentTime) {
      return NextResponse.json({ 
        error: "Essential information is required" 
      }, { status: 400 });
    }
    
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL is not defined");
      return NextResponse.json({ error: "Incorrect server configuration" }, { status: 500 });
    }
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Check if the appointment exists and if the user is the creator
    const existingAppointment = await sql`
      SELECT * FROM appointments WHERE id = ${id}
    `;
    
    if (existingAppointment.length === 0) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    
    if (existingAppointment[0].creator_id !== userId) {
      return NextResponse.json({ 
        error: "You are not authorized to modify this appointment" 
      }, { status: 403 });
    }

    // Replace your current transaction code with this one
    
    // Approach without Promise
    await sql.transaction((tx) => {
      // 1. Update the appointment
      const updateQuery = tx`
        UPDATE appointments 
        SET title = ${title}, 
            description = ${description || null}, 
            appointment_date = ${appointmentDate}, 
            appointment_time = ${appointmentTime},
            duration = ${duration || 30}
        WHERE id = ${id}
      `;
      
      // 2. Delete old participants
      const deleteQuery = tx`DELETE FROM appointment_participants WHERE appointment_id = ${id}`;
      
      // Create an array of queries (important for return type)
      const insertQueries = [];
      
      // 3. Add new participants
      for (const participant of participants) {
        const email = participant.email.trim();
        if (!email) continue;
        
        // Note: This part is different because we can't use await in this function
        // We use parameterized queries directly
        insertQueries.push(
          tx`
            WITH user_check AS (
              SELECT id FROM users WHERE email = ${email} LIMIT 1
            )
            INSERT INTO appointment_participants (
              appointment_id, user_id, email, is_confirmed
            ) 
            SELECT 
              ${id}, 
              (SELECT id FROM user_check), 
              ${email}, 
              CASE WHEN (SELECT id FROM user_check) = ${userId} THEN true ELSE false END
            WHERE EXISTS (SELECT 1 FROM user_check) OR true
          `
        );
      }
      
      // Return all queries to execute (not a Promise!)
      return [updateQuery, deleteQuery, ...insertQueries];
    });

    // Get the updated appointment after the transaction
    const updatedAppointment = await sql`
      SELECT 
        a.*, 
        u.name as creator_name,
        COALESCE(json_agg(
          json_build_object(
            'id', ap.id,
            'user_id', ap.user_id,
            'email', ap.email,
            'is_confirmed', ap.is_confirmed
          )
        ) FILTER (WHERE ap.id IS NOT NULL), '[]') as participants
      FROM appointments a
      JOIN users u ON a.creator_id = u.id
      LEFT JOIN appointment_participants ap ON a.id = ap.appointment_id
      WHERE a.id = ${id}
      GROUP BY a.id, a.title, a.description, a.creator_id, u.name,
               a.appointment_date, a.appointment_time, a.duration, a.created_at
    `;

    const result = updatedAppointment[0];
    
    return NextResponse.json({ 
      success: true, 
      message: "Appointment updated successfully",
      appointment: result
    });
    
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json({ 
      error: "Error updating appointment",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Delete an appointment
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { id } = params;
    
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL is not defined");
      return NextResponse.json({ error: "Incorrect server configuration" }, { status: 500 });
    }
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Check if the appointment exists and if the user is the creator
    const existingAppointment = await sql`
      SELECT * FROM appointments WHERE id = ${id}
    `;
    
    if (existingAppointment.length === 0) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    
    if (existingAppointment[0].creator_id !== userId) {
      return NextResponse.json({ 
        error: "You are not authorized to delete this appointment" 
      }, { status: 403 });
    }
    
    // Delete the appointment (cascade will automatically delete participants)
    await sql`DELETE FROM appointments WHERE id = ${id}`;
    
    return NextResponse.json({ 
      success: true, 
      message: "Appointment deleted successfully"
    });
    
  } catch (error) {
    console.error("Error deleting appointment:", error);
    return NextResponse.json({ 
      error: "Error deleting appointment",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}