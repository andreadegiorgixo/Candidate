# ===== Build: compila il jar con il Maven wrapper =====
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Prima solo pom e wrapper: le dipendenze restano in cache finché il pom non cambia
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline

COPY src src
RUN ./mvnw -B -q package -DskipTests \
    && cp target/*.jar app.jar

# ===== Runtime: solo JRE, utente non root =====
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN useradd --system --uid 1001 spring
USER spring

COPY --from=build /app/app.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
