"use client";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"
  

  export const LoginForm = () => {
    return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100"> 
        <Card className="w-96 bg-white shadow-md rounded-lg">
            <CardHeader>
                <CardTitle className="text-center text-2xl font-bold">Login</CardTitle>
                <CardDescription className="text-center text-gray-600">Welcome back! Please enter your details.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
                <input type="text" placeholder="Username" className="mb-4 p-2 border border-gray-300 rounded w-full" />
                <input type="password" placeholder="Password" className="mb-4 p-2 border border-gray-300 rounded w-full" />
                <Button className="w-full">Login</Button>
            </CardContent>
            <CardFooter className="flex justify-between">
                <a href="#" className="text-blue-500 hover:underline">Forgot Password?</a>
                <a href="#" className="text-blue-500 hover:underline">Sign Up</a>
            </CardFooter>
        </Card>
    </div>

  );
}
