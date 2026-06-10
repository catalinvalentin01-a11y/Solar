import Link from "next/link";

export default function Page() {
  return (
    <div className="p-6">

      <h1 className="text-2xl font-bold mb-2 text-gray-900" style={{ fontFamily: "inherit" }}>
        Dashboard
      </h1>

      <p className="mb-6 text-gray-700" style={{ fontFamily: "inherit" }}>
        Bine ai venit în Solar CRM
      </p>

      <div className="flex gap-3 flex-wrap">

        <Link
          href="/projects"
          className="bg-gray-800 text-white px-4 py-2 rounded"
        >
          Proiecte
        </Link>

        <Link
          href="/today"
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Montaje Azi
        </Link>

      </div>

    </div>
  );
}
