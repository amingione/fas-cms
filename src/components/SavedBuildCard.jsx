import { v4 as uuidv4 } from 'uuid';

export default function SavedBuildCard({ carModel, horsepower, date, status = 'Pending' }) {
  const id = uuidv4(); // optional: if you need a unique key outside this

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:shadow-lg transition shadow-black/20">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xl font-semibold">{carModel}</h3>
        <span className={`text-sm px-2 py-1 rounded ${
          status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
          status === 'Reviewed' ? 'bg-green-500/20 text-green-400' :
          'bg-gray-500/20 text-gray-300'
        }`}>
          {status}
        </span>
      </div>
      <p className="text-gray-300 text-sm mb-1">
        Horsepower: <span className="text-white">{horsepower} whp</span>
      </p>
      <p className="text-gray-500 text-xs">Saved on: {date}</p>
    </div>
  );
}