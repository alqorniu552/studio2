export type Container = {
  id: string;
  name: string;
  ports: string;
  sshPort: number;
  status: string;
  image: string;
};

export type CreateActionState = {
  error?: string | null;
  success?: boolean;
};

export type Image = {
  id: string;
  repository: string;
  tag: string;
  size: string;
  created: string;
};
