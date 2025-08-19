let shinyMode = false;
let backMode = false;
let currentPokemon = null; // store latest fetched Pokémon

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const pokemonCard = document.getElementById('pokemonCard');
const darkToggle = document.getElementById("darkModeToggle");
const battleButton = document.getElementById("battleButton");
const battleResult = document.getElementById("battleResult");
const suggestionsBox = document.getElementById("suggestions");
// Pokemon card elements
const pokemonImg = document.getElementById('pokemonImg');
const pokemonName = document.getElementById('pokemonName');
const pokemonId = document.getElementById('pokemonId');
const pokemonTypes = document.getElementById('pokemonTypes');
const pokemonAbilities = document.getElementById('pokemonAbilities');
const pokemonStats = document.getElementById('pokemonStats');
const pokemonMoves = document.getElementById('pokemonMoves');
const abilityDetails = document.getElementById('abilityDetails');
const typeDetails = document.getElementById('typeDetails');

// API base URL
const API_URL = 'https://pokeapi.co/api/v2/pokemon/';

// Event listeners
searchBtn.addEventListener('click', searchPokemon);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchPokemon();
    }
});

// Main search function
async function searchPokemon() {
    const query = searchInput.value.trim().toLowerCase();
    
    if (!query) {
        showError('Please enter a Pokémon name or ID');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${API_URL}${query}`);
        
        if (!response.ok) {
            throw new Error('Pokémon not found');
        }
        
        const pokemon = await response.json();
        displayPokemon(pokemon);
        
    } catch (err) {
        showError('Pokémon not found! Please check the spelling and try again.');
    }
}

let allPokemonNames = [];

// Fetch all Pokémon names at start
async function fetchAllPokemonNames() {
  const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1000");
  const data = await response.json();
  allPokemonNames = data.results.map(p => p.name);
}

fetchAllPokemonNames();

// Autocomplete search
searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();
  suggestionsBox.innerHTML = "";

  if (query.length === 0) {
    suggestionsBox.style.display = "none";
    return;
  }

  const filtered = allPokemonNames.filter(name =>
    name.toLowerCase().startsWith(query)
  );

  filtered.slice(0, 10).forEach(name => {
    const div = document.createElement("div");
    div.textContent = name;
    div.addEventListener("click", () => {
      searchInput.value = name;
      suggestionsBox.style.display = "none";
      fetchPokemon(name); // Call your existing function
    });
    suggestionsBox.appendChild(div);
  });

  suggestionsBox.style.display = filtered.length ? "block" : "none";
});

// Display Pokemon data
function displayPokemon(pokemon) {
    hideAll();
    
    // Set basic info
    pokemonImg.src = pokemon.sprites.other['official-artwork'].front_default || 
                     pokemon.sprites.front_default;
    pokemonImg.alt = pokemon.name;
    pokemonName.textContent = pokemon.name;
    pokemonId.textContent = `#${pokemon.id.toString().padStart(3, '0')}`;
    
    // Display types
    displayTypes(pokemon.types);
    
    // Display abilities
    displayAbilities(pokemon.abilities);
    
    // Display stats
    displayStats(pokemon.stats);

    // Display moves
    displayMoves(pokemon.moves);

    //Pokemon fetch function
    fetchEvolutionChain(pokemon);

    // Show the card
    pokemonCard.style.display = 'block';

    // Reset animation
    pokemonCard.style.animation = 'none';
    pokemonCard.offsetHeight; // Trigger reflow
    pokemonCard.style.animation = 'slideUp 0.6s ease forwards';
}

// Display Pokemon types
function displayTypes(types) {
    pokemonTypes.innerHTML = '';
    typeDetails.innerHTML = '';

    types.forEach(typeInfo => {
        const typeBadge = document.createElement('span');
        typeBadge.className = `type-badge type-${typeInfo.type.name}`;
        typeBadge.textContent = typeInfo.type.name;

        typeBadge.addEventListener('click', async () => {
            const res = await fetch(typeInfo.type.url);
            const typeData = await res.json();

            const damageRelations = typeData.damage_relations;

            typeDetails.innerHTML = `
                <h4>${typeData.name.toUpperCase()}</h4>
                <p><strong>Double Damage From:</strong> ${damageRelations.double_damage_from.map(t => t.name).join(', ') || "None"}</p>
                <p><strong>Double Damage To:</strong> ${damageRelations.double_damage_to.map(t => t.name).join(', ') || "None"}</p>
                <p><strong>Half Damage From:</strong> ${damageRelations.half_damage_from.map(t => t.name).join(', ') || "None"}</p>
                <p><strong>Half Damage To:</strong> ${damageRelations.half_damage_to.map(t => t.name).join(', ') || "None"}</p>
                <p><strong>No Damage From:</strong> ${damageRelations.no_damage_from.map(t => t.name).join(', ') || "None"}</p>
                <p><strong>No Damage To:</strong> ${damageRelations.no_damage_to.map(t => t.name).join(', ') || "None"}</p>
            `;
        });
        pokemonTypes.appendChild(typeBadge);
    });
}

let currentPokemonId = null;
let controller = null; // abort previous fetches
let debounceTimeout;

async function fetchEvolutionChain(pokemon) {
    const evolutionDiv = document.getElementById('evolutionChain');

    // Clear previous timeout
    clearTimeout(debounceTimeout);

    // Debounce to avoid rapid API calls
    debounceTimeout = setTimeout(async () => {
        // Abort previous fetch if still running
        if (controller) controller.abort();
        controller = new AbortController();
        const signal = controller.signal;

        // Update current ID
        currentPokemonId = pokemon.id;

        // Clear old cards immediately
        evolutionDiv.innerHTML = "Loading...";

        try {
            const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemon.id}/`, { signal });
            const speciesData = await speciesRes.json();

            const evoRes = await fetch(speciesData.evolution_chain.url, { signal });
            const evoData = await evoRes.json();

            let chain = [];
            let current = evoData.chain;

            while (current) {
                chain.push(current.species.name);
                current = current.evolves_to[0];
            }

            // Clear loading text before adding new cards
            evolutionDiv.innerHTML = '';

            for (let name of chain) {
                // Only display if this request is still current
                if (pokemon.id !== currentPokemonId) return;

                const pokeRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`, { signal });
                const pokeData = await pokeRes.json();

                const evoCard = document.createElement('div');
                evoCard.className = "evo-card";
                evoCard.innerHTML = `
                    <img src="${shinyMode ? pokeData.sprites.front_shiny : pokeData.sprites.front_default}" alt="${name}">
                    <p>${pokeData.name}</p>
                `;
                evolutionDiv.appendChild(evoCard);
            }

        } catch (error) {
            if (error.name === 'AbortError') return; // ignore aborted requests
            evolutionDiv.innerHTML = "No evolution data available.";
            console.error(error);
        }
    }, 300);
}


// Display Pokemon stats
function displayStats(stats) {
    pokemonStats.innerHTML = '';
    
    stats.forEach(statInfo => {
        const statItem = document.createElement('div');
        statItem.className = 'stat-item';
        
        const statName = document.createElement('span');
        statName.className = 'stat-name';
        statName.textContent = formatStatName(statInfo.stat.name);
        
        const statValue = document.createElement('span');
        statValue.className = 'stat-value';
        statValue.textContent = statInfo.base_stat;
        
        statItem.appendChild(statName);
        statItem.appendChild(statValue);
        pokemonStats.appendChild(statItem);
    });
}

//display moves
function displayMoves(moves) {
    pokemonMoves.innerHTML = '';
    moveDetails.innerHTML = '';

    moves.slice(0, 10).forEach(moveInfo => {
        const moveBadge = document.createElement('span');
        moveBadge.className = 'move-badge';
        moveBadge.textContent = moveInfo.move.name.replace('-', ' ');

        moveBadge.addEventListener('click', async () => {
            const res = await fetch(moveInfo.move.url);
            const moveData = await res.json();

            moveDetails.innerHTML = `
                <h4>${moveData.name.toUpperCase()}</h4>
                <p><strong>Type:</strong> ${moveData.type.name}</p>
                <p><strong>Power:</strong> ${moveData.power || "N/A"}</p>
                <p><strong>Accuracy:</strong> ${moveData.accuracy || "N/A"}</p>
                <p><strong>PP:</strong> ${moveData.pp}</p>
                <p><strong>Damage Class:</strong> ${moveData.damage_class.name}</p>
            `;
        });
        pokemonMoves.appendChild(moveBadge);
    });
}

function displayAbilities(abilities) {
    pokemonAbilities.innerHTML = '';
    abilityDetails.innerHTML = '';

    abilities.forEach(abilityInfo => {
        const abilityBadge = document.createElement('span');
        abilityBadge.className = 'ability-badge';
        abilityBadge.textContent = abilityInfo.ability.name.replace('-', ' ');

        abilityBadge.addEventListener('click', async () => {
            const res = await fetch(abilityInfo.ability.url);
            const abilityData = await res.json();

            // find English effect text
            const effect = abilityData.effect_entries.find(e => e.language.name === "en");

            abilityDetails.innerHTML = `
                <h4>${abilityData.name.toUpperCase()}</h4>
                <p><strong>Effect:</strong> ${effect ? effect.effect : "No description available"}</p>
            `;
        });

        pokemonAbilities.appendChild(abilityBadge);
    });
}

function updateSprites(pokemonData) {
    const pokemonImage = document.getElementById("pokemonImage");

    if (!pokemonImage) return;

    if (shinyMode) {
        pokemonImage.src = backMode 
            ? pokemonData.sprites.back_shiny 
            : pokemonData.sprites.front_shiny;
    } else {
        pokemonImage.src = backMode 
            ? pokemonData.sprites.back_default 
            : pokemonData.sprites.front_default;
    }
}

async function fetchPokemon(pokemon) {
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon.toLowerCase()}`);
        if (!response.ok) {
            alert("No Pokémon found!");
            return;
        }
        const data = await response.json();

        // Display Pokémon main info
        displayPokemon(data);

        // Show evolution chain
        fetchEvolutionChain(data);

        // ✅ Step 4: Handle shiny toggle
        document.getElementById("shinyToggle").onclick = () => {
            shinyMode = !shinyMode;

            // Update main sprite
            updateSprites(data);

            // Update evolution sprites
            fetchEvolutionChain(data);

            // // Change button text
            // document.getElementById("shinyToggle").textContent =
            //     shinyMode ? "Show Normal 🟡" : "Show Shiny ✨";
        };

    } catch (error) {
        console.error("Error fetching Pokémon:", error);
    }
}

// Format stat names for better readability
function formatStatName(statName) {
    const statNames = {
        'hp': 'HP',
        'attack': 'Attack',
        'defense': 'Defense',
        'special-attack': 'Sp. Attack',
        'special-defense': 'Sp. Defense',
        'speed': 'Speed'
    };
    
    return statNames[statName] || statName;
}

// Show loading state
function showLoading() {
    hideAll();
    loading.style.display = 'block';
}

// Show error message
function showError(message) {
    hideAll();
    error.textContent = message;
    error.style.display = 'block';
}

// Hide all elements
function hideAll() {
    loading.style.display = 'none';
    error.style.display = 'none';
    pokemonCard.style.display = 'none';
}

// Initialize with a random Pokemon on page load
window.addEventListener('load', () => {
    const randomId = Math.floor(Math.random() * 150) + 1; // First 150 Pokemon
    searchInput.value = randomId;
    searchPokemon();
});

// Dark Mode
// if (darkToggle) {
//   darkToggle.addEventListener("click", () => {
//     document.body.classList.toggle("dark-mode");

//     // Update button text/icon
//     if (document.body.classList.contains("dark-mode")) {
//       darkToggle.textContent = "☀️ Light Mode";
//     } else {
//       darkToggle.textContent = "🌙 Dark Mode";
//     }
//   });
// }

// Battle System Here ---->
battleButton.addEventListener("click", async () => {
  const p1 = document.getElementById("pokemon1").value.toLowerCase();
  const p2 = document.getElementById("pokemon2").value.toLowerCase();

  if (!p1 || !p2) {
    battleLog.innerHTML = "<p>Please enter both Pokémon!</p>";
    return;
  }

  // Placeholder image before fetching
const defaultImg = "default-placeholder.png"; // your custom placeholder

// Set placeholder initially
document.getElementById("pokemon1Img").src = defaultImg;
document.getElementById("pokemon2Img").src = defaultImg;

  try {
    const res1 = await fetch(`https://pokeapi.co/api/v2/pokemon/${p1}`);
    const res2 = await fetch(`https://pokeapi.co/api/v2/pokemon/${p2}`);
    if (!res1.ok || !res2.ok) throw new Error("Pokémon not found");

    const data1 = await res1.json();
    const data2 = await res2.json();

    // Initial stats
    let hp1 = data1.stats[0].base_stat;
    let hp2 = data2.stats[0].base_stat;
    const attack1 = data1.stats[1].base_stat;
    const attack2 = data2.stats[1].base_stat;

    // Set up UI
    document.getElementById("pokemon1Img").src = data1.sprites.front_default;
    document.getElementById("pokemon2Img").src = data2.sprites.front_default;
    document.getElementById("pokemon1Name").textContent = data1.name.toUpperCase();
    document.getElementById("pokemon2Name").textContent = data2.name.toUpperCase();
    document.getElementById("pokemon1Hp").style.width = "100%";
    document.getElementById("pokemon2Hp").style.width = "100%";

    battleLog.innerHTML = `<p>Battle Started! ${data1.name.toUpperCase()} vs ${data2.name.toUpperCase()}</p>`;

    // Turn-based fight
    const interval = setInterval(() => {
      // Player 1 attacks
      hp2 -= Math.floor(Math.random() * attack1 / 2) + 5;
      if (hp2 < 0) hp2 = 0;
      document.getElementById("pokemon2Hp").style.width = `${(hp2 / data2.stats[0].base_stat) * 100}%`;
      battleLog.innerHTML += `<p>${data1.name.toUpperCase()} attacks! ${data2.name.toUpperCase()} HP: ${hp2}</p>`;

      if (hp2 <= 0) {
        battleLog.innerHTML += `<h2>${data1.name.toUpperCase()} Wins 🎉</h2>`;
        clearInterval(interval);
        return;
      }

      // Player 2 attacks
      hp1 -= Math.floor(Math.random() * attack2 / 2) + 5;
      if (hp1 < 0) hp1 = 0;
      document.getElementById("pokemon1Hp").style.width = `${(hp1 / data1.stats[0].base_stat) * 100}%`;
      battleLog.innerHTML += `<p>${data2.name.toUpperCase()} attacks! ${data1.name.toUpperCase()} HP: ${hp1}</p>`;

      if (hp1 <= 0) {
        battleLog.innerHTML += `<h2>${data2.name.toUpperCase()} Wins 🎉</h2>`;
        clearInterval(interval);
      }
    }, 1500);
  } catch (err) {
    battleLog.innerHTML = "<p>One of the Pokémon not found!</p>";
  }
});

// function addLog(message) {
//   const log = document.getElementById("battleLog");
//   const entry = document.createElement("p");
//   entry.textContent = message;
//   log.appendChild(entry);
//   log.scrollTop = log.scrollHeight; // auto scroll
// }