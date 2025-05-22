"use client";

import { Calendar, Home, Inbox, Menu, Settings, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarFooter,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// Menu items.
const items = [
  {
    title: "Home",
    url: "/home",
    icon: Home,
  },
  {
    title: "Inbox",
    url: "#",
    icon: Inbox,
  },
  {
    title: "Calendar",
    url: "/home/calendar",
    icon: Calendar,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Détecter si on est sur mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px est généralement la limite pour les appareils mobiles
    };
    
    // Vérifier au chargement
    checkIfMobile();
    
    // Vérifier au redimensionnement
    window.addEventListener("resize", checkIfMobile);
    
    // Nettoyer l'event listener
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // Bouton pour basculer la sidebar sur mobile
  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };
   const { setTheme } = useTheme()

  return (
    
    <>
      {/* Bouton hamburger pour mobile */}
      {isMobile && !isExpanded && (
        <button 
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 p-2 bg-background rounded-md shadow-md"
        >
          <Menu size={24} />
        </button>
      )}
      
      <Sidebar 
        className={cn(
            "transition-all duration-300 ease-in-out h-screen relative border-r fixed md:relative overflow-hidden",
            isExpanded ? "w-64" : "w-16",
            isMobile && !isExpanded ? "translate-x-[-100%]" : "translate-x-0"
        )}
        onMouseEnter={() => !isMobile && setIsExpanded(true)}
        onMouseLeave={() => !isMobile && setIsExpanded(false)}
        >
        <SidebarContent className="overflow-y-hidden">
          <SidebarHeader className={cn(
            "flex items-center justify-between p-4", 
            isExpanded ? "w-64" : "w-16"
          )}>
            <div className="flex items-center">
            <Image 
              src="/favicon.ico" 
              alt="Logo" 
              width={32} 
              height={32} 
              className="h-8 w-8"
            />
              <span className={cn(
                "ml-2 text-lg font-bold transition-all", 
                isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
              )}>
                MyApp
              </span>
            </div>
            
            {/* Bouton fermer pour mobile */}
            {isMobile && isExpanded && (
              <button onClick={() => setIsExpanded(false)} className="text-gray-500">
                <X size={20} />
              </button>
            )}
          </SidebarHeader>
          
          <SidebarGroup>
            <SidebarGroupLabel className={cn(
              "transition-opacity", 
              isExpanded ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
            )}>
              Application
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild variant="default">
                      <a href={item.url} className={cn(
                        "flex items-center px-2 py-1 rounded-md", 
                        isExpanded ? "justify-start" : "justify-center"
                      )}>
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className={cn(
                          "ml-2 transition-all", 
                          isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
                        )}>
                          {item.title}
                        </span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="items-start overflow-hidden">
         <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu> 
        </SidebarFooter>
      </Sidebar>
    </>
  );
}