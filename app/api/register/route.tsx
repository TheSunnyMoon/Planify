import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();
    
    // Data validation
    if (!name || !email || !password) {
      return NextResponse.json({ 
        error: "Name, email, and password are required" 
      }, { status: 400 });
    }
    
    if (password.length < 8) {
      return NextResponse.json({ 
        error: "Password must be at least 8 characters long" 
      }, { status: 400 });
    }
    
    const sql = neon(process.env.DATABASE_URL as string);
    
    // Check if email is already in use
    const existingUser = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;
    
    if (existingUser.length > 0) {
      return NextResponse.json({ 
        error: "This email address is already in use" 
      }, { status: 409 });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create the user
    const newUser = await sql`
      INSERT INTO users (name, email, password)
      VALUES (${name}, ${email}, ${hashedPassword})
      RETURNING id, name, email
    `;
    
    return NextResponse.json({
      success: true,
      user: {
        id: newUser[0].id,
        name: newUser[0].name,
        email: newUser[0].email
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error("Error during registration:", error);
    return NextResponse.json({ 
      error: "Error creating account"
    }, { status: 500 });
  }
}