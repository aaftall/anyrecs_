import React from 'react';

function Title() {
  return (
    <header className="text-center my-8">
      <h1 className="text-6xl font-bold text-gray-800">AppSquad</h1>
    </header>
  );
}

function Description() {
  return (
    <p className="text-center mx-auto max-w-xl text-gray-600 mb-8 leading-relaxed text-lg">
      Connect, Recommend, Inspire
    </p>
  );
}

function HomePage() {

  return (
    <div className="App max-w-2xl mx-auto px-4">
      <Title />
      <Description />
    </div>
  );
}

export default HomePage;