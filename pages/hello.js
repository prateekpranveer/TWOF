      <div className="flex gap-2 w-40 h-4 items-center">
          {saving ? (
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-300 animate-[dot-bounce_0.8s_infinite]"></div>
              <div className="w-2 h-2 rounded-full bg-purple-300 animate-[dot-bounce_0.8s_infinite_0.15s]"></div>
              <div className="w-2 h-2 rounded-full bg-purple-300 animate-[dot-bounce_0.8s_infinite_0.3s]"></div>
            </div>
          ) : lastSaved ? (
            <div className="flex gap-2 items-center">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-900"></div>
                <div className="w-2 h-2 rounded-full bg-purple-900"></div>
                <div className="w-2 h-2 rounded-full bg-purple-900"></div>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              </div>
              <span className="text-gray-400 text-xs">Not saved yet</span>
            </div>
          )}
        </div>