"use client";

import { useEffect, useState } from "react";

interface User {
  id: number;
  email: string | null;
  name: string | null;
  number: string;
}

export default function AllUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/users");
        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) {
    return <div>Loading users...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">All Users</h2>
      <div className="grid gap-4">
        {users.map((user) => (
          <div
            key={user.id}
            className="p-4 border rounded-lg shadow-sm bg-white"
          >
            <p className="font-semibold">{user.name || "No name"}</p>
            <p className="text-gray-600">{user.email || "No email"}</p>
            <p className="text-gray-600">Phone: {user.number}</p>
          </div>
        ))}
      </div>
    </div>
  );
}