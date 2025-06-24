
"use server";

import { revalidatePath } from "next/cache";
import { type Container, type CreateActionState, type Image } from "@/lib/types";
import { NodeSSH } from "node-ssh";

const ssh = new NodeSSH();

async function connectSSH() {
  if (ssh.isConnected()) return;

  const host = process.env.SSH_HOST;
  const username = process.env.SSH_USERNAME;
  const password = process.env.SSH_PASSWORD;
  const privateKeyPath = process.env.SSH_PRIVATE_KEY_PATH;

  if (!host || !username || (!password && !privateKeyPath)) {
    const missingEnvMessage = 'Koneksi Gagal: File `.env.local` belum lengkap.\n\n' +
        'Pastikan file `.env.local` ada di direktori utama proyek Anda dan berisi semua detail yang diperlukan, seperti contoh di bawah ini. Ganti nilai placeholder dengan informasi VPS Anda.\n\n' +
        'Contoh Isi File `.env.local`:\n' +
        'SSH_HOST=123.45.67.89\n' +
        'SSH_USERNAME=root\n' +
        'SSH_PASSWORD=PasswordRahasiaAnda\n\n' +
        'Penting: Setelah membuat atau mengubah file ini, Anda **wajib** me-restart server aplikasi ini (hentikan dengan Ctrl+C, lalu jalankan lagi).';
    throw new Error(missingEnvMessage);
  }

  const sshConfig: {
    host: string;
    username: string;
    password?: string;
    privateKeyPath?: string;
  } = {
    host,
    username,
  };

  if (password) {
    sshConfig.password = password;
  }
  if (privateKeyPath) {
    sshConfig.privateKeyPath = privateKeyPath;
  }
  
  try {
    await ssh.connect(sshConfig);
  } catch (error: any) {
    if (error.message.includes('All configured authentication methods failed')) {
      const authDebugMessage = 'Otentikasi Gagal. VPS menolak login.\n\n' +
        'Ini adalah masalah paling umum. Mari kita periksa langkah demi langkah dengan sangat teliti:\n\n' +
        '1. Pastikan `SSH_USERNAME` dan `SSH_PASSWORD` di file `.env.local` Anda sudah 100% benar. Salah satu huruf atau angka saja akan menyebabkan kegagalan. Cara terbaik adalah menyalin dan menempelkannya langsung dari catatan Anda.\n\n' +
        '2. Pastikan VPS Anda mengizinkan login dengan password. Masuk ke VPS Anda, edit file `/etc/ssh/sshd_config`, dan pastikan ada baris `PasswordAuthentication yes`. Jika ada tanda `#` di depannya, hapus tanda `#` tersebut.\n\n' +
        '3. Setelah mengedit file `sshd_config` di VPS, Anda **WAJIB** me-restart layanan SSH dengan perintah `sudo systemctl restart ssh`.\n\n' +
        '4. Pastikan Anda hanya menggunakan satu metode login. Jika Anda mengisi `SSH_PASSWORD`, pastikan baris `SSH_PRIVATE_KEY_PATH` di file `.env.local` dikosongkan atau diberi komentar (diawali #).\n\n' +
        '5. Terakhir, setiap kali Anda mengubah file `.env.local`, Anda **WAJIB** me-restart server aplikasi ini di komputer lokal Anda (hentikan dengan Ctrl+C, lalu jalankan lagi).';
      
      throw new Error(authDebugMessage);
    }
    if (error.message.includes('does not exist at given fs path')) {
        const keyPathDebugMessage = 'Kunci SSH Privat Tidak Ditemukan.\n\n' +
        'Aplikasi tidak dapat menemukan file kunci privat di path yang Anda tentukan di `.env.local`.\n\n' +
        'Mari kita periksa dengan teliti:\n\n' +
        '1. Pastikan nilai `SSH_PRIVATE_KEY_PATH` di file `.env.local` Anda sudah 100% benar. Periksa setiap huruf, garis miring, dan titik.\n\n' +
        '2. Path harus **absolut (lengkap)**, bukan relatif. Jangan gunakan `~`.\n' +
        '   - Contoh Benar (Linux/macOS): `/home/namaanda/.ssh/id_rsa`\n' +
        '   - Contoh Benar (Windows): `C:/Users/NamaAnda/.ssh/id_rsa`\n\n' +
        '3. Pastikan file kunci privat (misalnya `id_rsa`, bukan `id_rsa.pub`) benar-benar ada di lokasi tersebut.\n\n' +
        '4. Setiap kali Anda mengubah file `.env.local`, Anda **WAJIB** me-restart server aplikasi ini (hentikan dengan Ctrl+C, lalu jalankan lagi).';
        
        throw new Error(keyPathDebugMessage);
    }
    // Re-throw other types of errors
    throw error;
  }
}

const BASE_SSH_PORT = 2200;
const DOCKER_IMAGE = "rastasheep/ubuntu-sshd:18.04";

function parseSshPort(portString: string): number | null {
  const match = portString.match(/0\.0\.0\.0:(\d+)->22\/tcp/);
  return match ? parseInt(match[1], 10) : null;
}

export async function getContainers(): Promise<Container[]> {
    await connectSSH();
    const result = await ssh.execCommand('docker ps -a --format "{{json .}}"');

    if (result.code !== 0) {
        const stderr = result.stderr || "Unknown Docker error on the remote server.";
        if (stderr.includes('command not found') || stderr.includes('not found: docker')) {
            throw new Error("Docker tidak terinstal atau tidak dapat diakses di server remote.");
        }
        throw new Error(stderr);
    }
    
    if (!result.stdout) {
      return [];
    }

    const dockerContainers = result.stdout
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          console.error("Failed to parse Docker output line:", line, e);
          return null;
        }
      })
      .filter(Boolean);

    return dockerContainers.map((c: any): Container => ({
      id: c.ID,
      name: c.Names,
      ports: c.Ports,
      sshPort: parseSshPort(c.Ports) || 0,
      status: c.State,
      image: c.Image,
    }));
}


async function getNextAvailablePort(): Promise<number> {
    const containers = await getContainers();
    if (containers.length === 0) {
      return BASE_SSH_PORT + 1;
    }
    const usedPorts = new Set(containers.map(c => c.sshPort).filter(p => p > 0));
    let nextPort = BASE_SSH_PORT + 1;
    while (usedPorts.has(nextPort)) {
      nextPort += 1;
    }
    return nextPort;
}


export async function createContainer(prevState: CreateActionState, formData: FormData): Promise<CreateActionState> {
  const clientName = formData.get("client_name") as string;

  if (!clientName || clientName.trim().length === 0) {
    return { error: "Nama klien tidak boleh kosong." };
  }
  
  if (/\s/.test(clientName)) {
    return { error: "Nama klien tidak boleh mengandung spasi." };
  }

  try {
    const existingContainers = await getContainers();
    if (existingContainers.some(c => c.name === clientName)) {
      return { error: `Kontainer dengan nama "${clientName}" sudah ada.` };
    }

    const sshPort = await getNextAvailablePort();
    
    await connectSSH();

    const command = `docker run -d --name ${clientName} -p ${sshPort}:22 ${DOCKER_IMAGE}`;
    const result = await ssh.execCommand(command);

    if (result.code !== 0 || result.stderr) {
        console.error('Gagal membuat kontainer:', result.stderr);
        return { error: `Gagal membuat kontainer: ${result.stderr}` };
    }

    revalidatePath("/");
    return { success: true };

  } catch (e: any) {
    console.error("Gagal membuat kontainer:", e);
    return { error: e.message || "Terjadi kesalahan tak terduga saat membuat kontainer." };
  }
}

export async function deleteContainer(formData: FormData) {
    const containerId = formData.get('containerId') as string;

    if(!containerId) {
        throw new Error("ID Kontainer dibutuhkan.");
    }

    try {
        await connectSSH();
        const command = `docker rm -f ${containerId}`;
        const result = await ssh.execCommand(command);
        
        if (result.code !== 0 && result.stderr) {
            console.error(`Gagal menghapus kontainer ${containerId}:`, result.stderr);
        }

        revalidatePath("/");
    } catch (e) {
        console.error("Gagal menghapus kontainer:", e);
        throw new Error("Gagal menghapus kontainer.");
    }
}

export async function installDocker(prevState: { error?: string | null, success?: boolean }, formData: FormData): Promise<{ error?: string | null, success?: boolean }> {
  try {
    await connectSSH();

    const DOCKER_INSTALL_COMMAND = "curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh";
    const result = await ssh.execCommand(DOCKER_INSTALL_COMMAND, {
      execOptions: { pty: true }
    });

    if (result.code !== 0) {
      if (result.stderr.includes('sudo: a password is required') || result.stderr.includes('sudo: no tty present')) {
        return { error: "Instalasi memerlukan hak akses `sudo` tanpa kata sandi untuk pengguna SSH." };
      }
      console.error('Instalasi Docker gagal:', result.stderr);
      return { error: `Skrip gagal. Stderr: ${result.stderr}` };
    }
    
    // This command needs the username, which might not be available in this scope easily.
    // It's better to instruct the user to do this manually if needed.
    // const ADD_USER_TO_DOCKER_GROUP_COMMAND = `sudo usermod -aG docker ${process.env.SSH_USERNAME}`;
    // await ssh.execCommand(ADD_USER_TO_DOCKER_GROUP_COMMAND);

    return { success: true };

  } catch (e: any) {
    console.error("Gagal menginstal Docker:", e);
    return { error: e.message || "Terjadi kesalahan tak terduga saat instalasi." };
  }
}

export async function getImages(): Promise<Image[]> {
    await connectSSH();
    const result = await ssh.execCommand('docker images --format "{{json .}}"');

    if (result.code !== 0) {
        const stderr = result.stderr || "Unknown Docker error on the remote server.";
        if (stderr.includes('command not found') || stderr.includes('not found: docker')) {
            throw new Error("Docker tidak terinstal atau tidak dapat diakses di server remote.");
        }
        throw new Error(stderr);
    }

    if (!result.stdout) {
      return [];
    }

    const dockerImages = result.stdout
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          console.error("Gagal mem-parsing output image Docker:", line, e);
          return null;
        }
      })
      .filter(Boolean);

    return dockerImages.map((img: any): Image => ({
      id: img.ID,
      repository: img.Repository,
      tag: img.Tag,
      size: img.Size,
      created: img.CreatedSince,
    }));
}

export async function deleteImage(formData: FormData) {
    const imageId = formData.get('imageId') as string;

    if(!imageId) {
        throw new Error("ID Image dibutuhkan.");
    }

    try {
        await connectSSH();
        const command = `docker rmi -f ${imageId}`;
        const result = await ssh.execCommand(command);

        if (result.code !== 0 && result.stderr) {
            console.error(`Gagal menghapus image ${imageId}:`, result.stderr);
        }

        revalidatePath("/images");
    } catch (e) {
        console.error("Gagal menghapus image:", e);
        throw new Error("Gagal menghapus image.");
    }
}
