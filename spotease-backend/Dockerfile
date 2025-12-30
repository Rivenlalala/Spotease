FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /app

# Copy pom.xml and download dependencies (cached layer)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build
COPY src ./src
RUN mvn package -DskipTests -Dmaven.test.skip=true

FROM eclipse-temurin:17-jre-alpine

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy JAR with proper ownership
COPY --from=build --chown=appuser:appgroup /app/target/*.jar app.jar

# Switch to non-root user
USER appuser

EXPOSE 8080

# JVM configuration for containerized environments
ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-XX:InitialRAMPercentage=50.0", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-jar", "app.jar"]
