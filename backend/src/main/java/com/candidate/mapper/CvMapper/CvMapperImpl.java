package com.candidate.mapper.CvMapper;

import org.springframework.stereotype.Component;

import com.candidate.dto.CvDTO;
import com.candidate.entity.CvInfo;

@Component
public class CvMapperImpl implements CvMapper {

    // il contenuto del file non viene mai copiato nel dto
    @Override
    public CvDTO toDTO(CvInfo cv) {
        if (cv == null) {
            return null;
        }
        return new CvDTO(cv.getId(), cv.getNome(), cv.getNomeFile(), cv.getContentType(), cv.getDimensione(),
                cv.getDataCaricamento());
    }
}
