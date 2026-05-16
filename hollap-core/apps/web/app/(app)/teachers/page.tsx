"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import type { TeacherListItem } from "../../../lib/types";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<TeacherListItem[]>("/api/teachers?category=Borsa%20%26%20Finans", false)
      .then(setTeachers)
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "Bir hata olustu"),
      );
  }, []);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Borsa & Finans Ogretmenleri</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teachers.map((teacher) => (
          <article
            key={teacher.userId}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-sm text-slate-600">{teacher.category}</p>
            <h2 className="mt-1 text-lg font-semibold">{teacher.user.name}</h2>
            <p className="mt-2 line-clamp-3 text-sm text-slate-700">{teacher.bio}</p>
            <p className="mt-3 text-sm font-medium">
              {teacher.priceMonthly.toLocaleString("tr-TR")} TL / ay
            </p>
            <Link
              href={`/teachers/${teacher.userId}`}
              className="mt-4 inline-flex rounded-md bg-brand px-4 py-2 text-sm font-medium text-white"
            >
              Profili Ac
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
