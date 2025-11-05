document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

  // Clear loading message
  activitiesList.innerHTML = "";

  // Clear select options except the placeholder so we don't duplicate options on re-fetch
  activitySelect.querySelectorAll("option:not([value=''])").forEach(o => o.remove());

  // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML (bulleted list with delete buttons)
        const participantsHtml = details.participants && details.participants.length > 0
          ? `<ul class="participants-list">${details.participants.map(p => `
              <li class="participant-item">
                <span class="participant-email">${p}</span>
                <button class="delete-participant" aria-label="Remove ${p}" data-activity="${name}" data-email="${p}">\u00d7</button>
              </li>`).join("")}</ul>`
          : `<p class="no-participants"><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <p class="participants-title"><strong>Participants</strong></p>
            ${participantsHtml}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const emailInput = document.getElementById("email");
    const activityInput = document.getElementById("activity");
    const submitButton = signupForm.querySelector("button[type='submit']");
    const email = emailInput.value;
    const activity = activityInput.value;

    // Disable submit to prevent double submits
    submitButton.disabled = true;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();
        // Refresh activities list to show updated participants and wait for it to finish
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide/clear message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
        messageDiv.className = "";
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    } finally {
      submitButton.disabled = false;
    }
  });

  // Delegate clicks for participant delete buttons
  activitiesList.addEventListener("click", async (e) => {
    const btn = e.target.closest && e.target.closest('.delete-participant');
    if (!btn) return;

    const activity = btn.dataset.activity;
    const email = btn.dataset.email;

    // optimistic disable
    btn.disabled = true;

    try {
      const resp = await fetch(`/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });

      const payload = await resp.json().catch(() => ({}));

      if (resp.ok) {
        messageDiv.textContent = payload.message || `Removed ${email} from ${activity}`;
        messageDiv.className = 'message success';
        messageDiv.classList.remove('hidden');
        // Refresh the list so UI stays in sync
        fetchActivities();
      } else {
        messageDiv.textContent = payload.detail || 'Failed to remove participant';
        messageDiv.className = 'message error';
        messageDiv.classList.remove('hidden');
      }
      // auto-hide
      setTimeout(() => {
        messageDiv.classList.add('hidden');
        messageDiv.className = '';
      }, 4000);
    } catch (err) {
      console.error('Error removing participant:', err);
      messageDiv.textContent = 'Network error removing participant';
      messageDiv.className = 'message error';
      messageDiv.classList.remove('hidden');
    } finally {
      btn.disabled = false;
    }
  });

  // Initialize app
  fetchActivities();
});
