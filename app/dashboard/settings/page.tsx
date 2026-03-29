"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, User, Bell, Shield, LogOut, ExternalLink } from "lucide-react";

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Account Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Account</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{user?.fullName || "No name set"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Plan</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="font-semibold">Free</p>
              <Badge variant="outline">Active</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All core features included
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-semibold">Email</p>
            <p className="text-xs text-muted-foreground mt-1">
              Invoices, stock alerts, expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Account Actions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">Profile & Security</p>
              <p className="text-sm text-muted-foreground">
                Update your name, email, password and connected accounts
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => openUserProfile()}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Manage Profile
            </Button>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">Signed in as</p>
              <p className="text-sm text-muted-foreground">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-200">
              Active Session
            </Badge>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-red-600">Sign Out</p>
              <p className="text-sm text-muted-foreground">
                Sign out of your SmartReceipt account
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => signOut({ redirectUrl: "/" })}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}