package com.candidate.mapper.CvMapper;

import com.candidate.dto.CvDTO;
import com.candidate.entity.CvInfo;

public interface CvMapper {
    CvDTO toDTO(CvInfo cv);
}
