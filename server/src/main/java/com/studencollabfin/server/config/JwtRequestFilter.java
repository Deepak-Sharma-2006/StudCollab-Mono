package com.studencollabfin.server.config;

import com.studencollabfin.server.service.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

// ✅ FIX: Enable JWT authentication filter
@Component
public class JwtRequestFilter extends OncePerRequestFilter {

    // Added the logger declaration to fix the error
    private static final Logger logger = LoggerFactory.getLogger(JwtRequestFilter.class);

    private final UserService userService;
    private final JwtUtil jwtUtil;

    public JwtRequestFilter(UserService userService, JwtUtil jwtUtil) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain chain)
            throws ServletException, IOException {

        final String authorizationHeader = request.getHeader("Authorization");

        String username = null;
        String jwt = null;

        try {
            if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
                jwt = authorizationHeader.substring(7);
                logger.info("🔑 JWT token extracted from header");

                try {
                    username = jwtUtil.getUsernameFromToken(jwt);
                    logger.info("✅ Username extracted from token: {}", username);
                } catch (Exception e) {
                    logger.error("❌ Error extracting username from token: {}", e.getMessage());
                }
            } else {
                logger.debug("⚠️ No Bearer token found in Authorization header");
            }

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                try {
                    UserDetails userDetails = userService.loadUserByUsername(username);
                    logger.info("✅ UserDetails loaded for: {}", username);

                    if (jwtUtil.validateToken(jwt, userDetails)) {
                        logger.info("✅ JWT token validated successfully for user: {}", username);
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                        logger.info("✅ Authentication set in SecurityContext for: {}", username);
                    } else {
                        logger.warn("❌ JWT token validation failed for user: {}", username);
                    }
                } catch (Exception e) {
                    logger.error("❌ Error loading user or validating token: {}", e.getMessage());
                }
            }
        } catch (Exception e) {
            logger.error("❌ Unexpected error in JWT filter: {}", e.getMessage());
        }

        chain.doFilter(request, response);
    }
}
