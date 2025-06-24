"use server";

import { revalidatePath } from "next/cache";
import { type Container, type CreateActionState } from "@/lib/types";

// --- SIMULATED DATABASE ---
// In a real application, you would use a proper database (e.g., SQLite, PostgreSQL).
// This in-memory array will reset on every server restart.
let containers: Container[] = [];
// --- END SIMULATED DATABASE ---


const BASE_SSH_PORT = 2200;
const DOCKER_IMAGE = "rastasheep/ubuntu-sshd:18.04";

function getNextAvailablePort(): number {
  if (containers.length === 0) {
    return BASE_SSH_PORT + 1;
  }
  const usedPorts = new Set(containers.map(c => c.sshPort));
  let nextPort = BASE_SSH_PORT + 1;
  while (usedPorts.has(nextPort)) {
    nextPort += 1;
  }
  return nextPort;
}

export async function getContainers(): Promise<Container[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return containers;
}

export async function createContainer(prevState: CreateActionState, formData: FormData): Promise<CreateActionState> {
  const clientName = formData.get("client_name") as string;

  if (!clientName || clientName.trim().length === 0) {
    return { error: "Client name cannot be empty." };
  }
  
  if (/\s/.test(clientName)) {
    return { error: "Client name cannot contain spaces." };
  }

  if (containers.some(c => c.name === clientName)) {
    return { error: `A container with the name "${clientName}" already exists.` };
  }

  try {
    const sshPort = getNextAvailablePort();
    
    const newContainer: Container = {
      id: crypto.randomUUID(),
      name: clientName,
      sshPort: sshPort,
      ports: `0.0.0.0:${sshPort}->22/tcp`,
      status: 'running',
      image: DOCKER_IMAGE,
    };

    containers.push(newContainer);
    revalidatePath("/");
    return { success: true };

  } catch (e) {
    console.error("Error creating container:", e);
    return { error: "An unexpected error occurred while creating the container." };
  }
}

export async function deleteContainer(formData: FormData) {
    const containerId = formData.get('containerId') as string;

    if(!containerId) {
        throw new Error("Container ID is required.");
    }

    try {
        containers = containers.filter(c => c.id !== containerId);
        revalidatePath("/");
    } catch (e) {
        console.error("Error deleting container:", e);
        throw new Error("Failed to delete container.");
    }
}
