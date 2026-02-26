"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableRow } from "./SortableRow";

type Course = { id: string; name: string; isPublished: boolean; sortOrder: number };

export default function CoursesListClient({
  initialCourses,
  programId,
}: {
  initialCourses: Course[];
  programId: string;
}) {
  const [courses, setCourses] = useState(initialCourses);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = courses.findIndex((c) => c.id === active.id);
    const newIndex = courses.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(courses, oldIndex, newIndex);
    setCourses(reordered);

    await fetch("/api/admin/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "courses", items: reordered.map((c) => ({ id: c.id })) }),
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="table-responsive-card overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr className="bg-base-200 text-base-content/60 text-xs uppercase tracking-widest font-body">
              <th className="w-8" />
              <th>Name</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <SortableContext items={courses.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {courses.map((c) => (
                <SortableRow key={c.id} id={c.id}>
                  <td data-label="Name" className="font-body font-medium">{c.name}</td>
                  <td data-label="Status">
                    {c.isPublished ? (
                      <span className="badge badge-success gap-1 font-body text-xs">Published</span>
                    ) : (
                      <span className="badge badge-ghost font-body text-xs">Draft</span>
                    )}
                  </td>
                  <td data-label="Actions">
                    <div className="flex gap-2">
                      <Link href={`/admin/programs/${programId}/courses/${c.id}`} className="btn btn-ghost btn-xs rounded-lg font-body">Edit</Link>
                      <Link href={`/admin/programs/${programId}/courses/${c.id}/classes`} className="btn btn-ghost btn-xs rounded-lg gap-1 font-body">
                        <GraduationCap className="w-3.5 h-3.5" /> Classes
                      </Link>
                    </div>
                  </td>
                </SortableRow>
              ))}
            </tbody>
          </SortableContext>
        </table>
      </div>
    </DndContext>
  );
}
