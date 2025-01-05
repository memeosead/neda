const csvUrl =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vQSIvIJ3WVO45kN-Ee5ch_cfLecGOsrFNiiF2dF1oaEAuwc0knIrCf3STeh05c9BXgAM7hjSjb3ANuA/pub?gid=293198783&single=true&output=csv";
      const defaultIconUrl = "https://i.postimg.cc/wv4fwjRd/location.png"; // مسار الصورة الافتراضية

      const map = L.map("map").setView([29, 22], 3);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(
        map
      );

      let markersLayer = L.layerGroup().addTo(map);

      async function fetchData() {
        try {
          const response = await fetch(csvUrl);
          const csvText = await response.text();
          const parsedData = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
          });
          const headers = parsedData.meta.fields;

          if (
            !headers.includes("خط الطول") ||
            !headers.includes("دائرة العرض")
          ) {
            document.getElementById("typeFilters").innerHTML =
              "<p>ملف CSV يفتقد أعمدة الإحداثيات.</p>";
            return null;
          }

          const types = new Set();
          const features = parsedData.data.map((row) => {
            types.add(row["النوع الرئيسى"]);
            return row;
          });

          return { headers, types: Array.from(types), features };
        } catch (error) {
          console.error("خطأ في تحميل البيانات:", error);
          document.getElementById("typeFilters").innerHTML =
            "<p>حدث خطأ أثناء تحميل البيانات.</p>";
          return null;
        }
      }

      async function initialize() {
        const data = await fetchData();
        if (!data) return;

        const { headers, types, features } = data;

        const iframe = document.getElementById("websiteFrame");
        iframe.src = features[0]["موقع الكتروني"] || "about:blank";

        const container = document.getElementById("typeFilters");
        container.innerHTML = "";
        const activeFilters = new Set(types);

        const dataContent = document.getElementById("info");
        function updateDataContent(feature) {
          const excludedKeys = ["خط الطول", "دائرة العرض", "مسلسل", "الأيقونه"];
          dataContent.innerHTML = Object.entries(feature)
            .filter(([key]) => !excludedKeys.includes(key))
            .map(([key, value]) => {
              return `<div class="row">
              <span class="label">${key}</span>
              <span class="value">${value}</span>
            </div>`;
            })
            .join("");
        }
        updateDataContent(features[0]);

        types.forEach((type) => {
          const div = document.createElement("div");
          div.className = "type-item";
          div.innerHTML = `<span class="label">${type}</span>
          <button class="toggle-btn"><i class="fas fa-eye"></i></button>`;
          div.querySelector("button").addEventListener("click", (e) => {
            const button = e.target.closest("button");
            const icon = button.querySelector("i");

            if (icon.classList.contains("fa-eye")) {
              icon.classList.remove("fa-eye");
              icon.classList.add("fa-eye-slash");
              activeFilters.delete(type);
            } else {
              icon.classList.remove("fa-eye-slash");
              icon.classList.add("fa-eye");
              activeFilters.add(type);
            }
            updateMap();
          });
          container.appendChild(div);
        });

        function updateMap() {
          markersLayer.clearLayers();
          const filteredFeatures = features.filter((feature) =>
            activeFilters.has(feature["النوع الرئيسى"])
          );

          filteredFeatures.forEach((feature) => {
            const lat = parseFloat(feature["خط الطول"]);
            const lng = parseFloat(feature["دائرة العرض"]);
            const iconUrl = feature["الأيقونه"] || defaultIconUrl;

            if (!isNaN(lat) && !isNaN(lng)) {
              const icon = L.icon({
                iconUrl,
                iconSize: [40, 40],
              });

              const marker = L.marker([lat, lng], { icon }).addTo(markersLayer);
              marker.bindPopup(feature["النوع الرئيسى"] || "نقطة غير معروفة");
              marker.on("click", () => {
                iframe.src = feature["موقع الكتروني"] || "about:blank";
                updateDataContent(feature);
              });
            }
          });
        }

        updateMap();
      }

      initialize();