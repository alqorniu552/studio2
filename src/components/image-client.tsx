"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Image } from "@/lib/types";
import { DeleteImageButton } from "./delete-image-button";

export function ImageClient({
  initialImages,
}: {
  initialImages: Image[];
}) {

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-4 font-headline">
          Docker Images
        </h2>
        <Card className="shadow-md">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repository</TableHead>
                  <TableHead>Tag</TableHead>
                  <TableHead>Image ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialImages.length > 0 ? (
                  initialImages.map((image) => (
                    <TableRow key={image.id}>
                      <TableCell className="font-medium">
                        {image.repository}
                      </TableCell>
                       <TableCell>{image.tag}</TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted p-1 rounded-sm">{image.id.substring(0, 12)}</code>
                      </TableCell>
                      <TableCell>{image.created}</TableCell>
                      <TableCell>{image.size}</TableCell>
                      <TableCell className="text-right">
                        <DeleteImageButton imageId={image.id} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No images found on the server.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
