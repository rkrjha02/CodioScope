document.addEventListener("DOMContentLoaded", () => {
    const submitButton = document.querySelector("#usernameform button");

    submitButton.addEventListener("click", async () => {
        const userNameInput = document.querySelector("#username");
        const userName = userNameInput.value.trim();

        if (!userName) {
            alert("Please Enter a UserName");
            return;
        }

        try {
            const userInfo = await fetchUserInfo(userName);
            console.log(userInfo);
            displayUserInfo(userInfo);
        } catch (error) {
            console.error("Error fetching Data:", error);
            alert("Failed to fetch Data...Please try again!!!");
        }
    });
});

async function fetchUserInfo(username) {
    const BaseURL = `https://alfa-leetcode-api.onrender.com/user/${username}`;
    try {
        const response = await fetch(BaseURL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const userInfo = await response.json();
        return userInfo;
    } catch (error) {
        console.error("Fetch error:", error);
        throw error; // Re-throw the error so it can be caught in the calling function
    }
}

function displayUserInfo(userInfo) {
    const container = document.getElementById("container");
    if (userInfo && userInfo.username) { // Ensure userInfo is valid
        container.innerHTML = `
        <h2 class="title is-4 has-text-centered">User Info</h2>
        <div class="card mb-4">
          <div class="card-image">
            <figure class="image is-128x128 mt-3 ml-3">
              <img src="${userInfo.avatar}" alt="User Avatar">
            </figure>
          </div>
          <div class="card-content">
            <p><strong>Username:</strong> ${userInfo.username}</p>
            <p><strong>Real Name:</strong> ${userInfo.realName}</p>
            <p><strong>Country:</strong> ${userInfo.countryName}</p>
          </div>
        </div>
      `;
    } else {
        container.innerHTML = '<p>User not found or no data available.</p>';
    }
}