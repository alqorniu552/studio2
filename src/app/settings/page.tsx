import Link from "next/link";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Container, LayoutDashboard, Rocket, Settings, LifeBuoy } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default async function SettingsPage() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <div className="p-1.5 rounded-lg bg-primary/20">
              <Rocket className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-semibold font-headline text-primary-foreground group-data-[collapsible=icon]:hidden">
              ContainerPilot
            </h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/">
                <SidebarMenuButton tooltip="Dasbor">
                  <LayoutDashboard />
                  <span className="font-headline">Dasbor</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/images">
                <SidebarMenuButton tooltip="Images">
                  <Container />
                  <span className="font-headline">Images</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/settings">
                <SidebarMenuButton isActive tooltip="Pengaturan">
                  <Settings />
                  <span className="font-headline">Pengaturan</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
             <SidebarMenuItem>
                <SidebarMenuButton tooltip="Bantuan">
                  <LifeBuoy />
                  <span className="font-headline">Bantuan</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Profil Pengguna">
                <Avatar className="size-7">
                    <AvatarImage src="https://placehold.co/40x40.png" alt="User" data-ai-hint="user avatar" />
                    <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <span className="font-headline">Profil Pengguna</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 bg-card/80 backdrop-blur-sm border-b sticky top-0 z-10 h-16">
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
          <h1 className="text-2xl font-bold font-headline text-foreground hidden md:block">
            Pengaturan
          </h1>
          <div className="flex-1" />
           {/* Placeholder for future header actions */}
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Pengaturan Aplikasi</CardTitle>
                    <CardDescription>Kelola preferensi aplikasi Anda di sini.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="dark-mode" className="flex flex-col space-y-1">
                            <span>Mode Gelap</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                Aktifkan atau nonaktifkan mode gelap untuk aplikasi.
                            </span>
                        </Label>
                        <Switch id="dark-mode" disabled />
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="notifications" className="flex flex-col space-y-1">
                            <span>Notifikasi Email</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                Terima notifikasi tentang perubahan status kontainer.
                            </span>
                        </Label>
                        <Switch id="notifications" disabled />
                    </div>
                </CardContent>
            </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
